export function relaxSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const props = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!props) return schema;
  const relaxed = Object.fromEntries(
    Object.entries(props).map(([k, v]) => {
      // Strip enum constraints on strings — the model may pass valid-but-unlisted
      // values (e.g. sort:"popular") that cause Groq 400 schema rejections.
      if (v.type === "string" && v.enum) {
        const rest = { ...v };
        delete rest.enum;
        return [k, rest];
      }
      if (v.type === "integer" || v.type === "number") {
        const rest = { ...v };
        delete rest.type;
        return [k, { ...rest, anyOf: [{ type: v.type }, { type: "string" }] }];
      }
      if (v.anyOf && Array.isArray(v.anyOf)) {
        const arr = v.anyOf as Record<string, unknown>[];
        const hasNumeric = arr.some(
          (s) => s.type === "number" || s.type === "integer"
        );
        if (hasNumeric)
          return [k, { ...v, anyOf: [...arr, { type: "string" }] }];
      }
      if (v.type === "array" || v.type === "object") {
        const rest = { ...v };
        delete rest.type;
        return [k, { ...rest, anyOf: [{ type: v.type }, { type: "string" }] }];
      }
      if (v.type === "boolean") {
        const rest = { ...v };
        delete rest.type;
        return [k, { ...rest, anyOf: [{ type: "boolean" }, { type: "string" }] }];
      }
      return [k, v];
    })
  );
  const defs = schema.$defs as
    | Record<string, Record<string, unknown>>
    | undefined;
  const relaxedDefs = defs
    ? Object.fromEntries(
        Object.entries(defs).map(([k, v]) => [k, relaxSchema(v)])
      )
    : undefined;
  return {
    ...schema,
    properties: relaxed,
    ...(relaxedDefs ? { $defs: relaxedDefs } : {}),
  };
}

export function resolveSchema(rawSchema: Record<string, unknown>): {
  schema: Record<string, unknown>;
  needsParamsWrap: boolean;
} {
  const props = rawSchema.properties as Record<string, unknown> | undefined;
  const required = rawSchema.required as string[] | undefined;
  const defs = rawSchema.$defs as Record<string, unknown> | undefined;
  if (
    props &&
    required?.length === 1 &&
    required[0] === "params" &&
    props.params
  ) {
    const paramsEntry = props.params as Record<string, unknown>;
    const ref = paramsEntry.$ref as string | undefined;
    if (ref && defs) {
      const refName = ref.split("/").pop()!;
      const inner = defs[refName] as Record<string, unknown> | undefined;
      if (inner) {
        return { schema: { ...inner, $defs: defs }, needsParamsWrap: true };
      }
    }
  }
  return { schema: rawSchema, needsParamsWrap: false };
}

export function coerceArgTypes(
  args: Record<string, unknown>,
  schema: Record<string, unknown>
): Record<string, unknown> {
  type FieldSchema = { type?: string; anyOf?: { type?: string }[] };
  const props = (schema.properties as Record<string, FieldSchema>) || {};
  const result = { ...args };

  for (const [key, val] of Object.entries(result)) {
    if (val === null || val === undefined) continue;
    const field = props[key];
    if (!field) continue;
    const t = field.type;
    const anyOf = field.anyOf;

    if (typeof val === "string") {
      if (t === "integer") {
        const n = parseInt(val, 10);
        if (!isNaN(n)) result[key] = n;
      } else if (t === "number") {
        const n = parseFloat(val);
        if (!isNaN(n)) result[key] = n;
      } else if (t === "boolean") {
        result[key] = val === "true";
      } else if (t === "array" || t === "object") {
        try {
          result[key] = JSON.parse(val);
        } catch { /* leave */ }
      } else if (anyOf) {
        const hasInt = anyOf.some((s) => s.type === "integer");
        const hasNum = anyOf.some((s) => s.type === "number");
        const hasNull = anyOf.some((s) => s.type === "null");
        const hasArr = anyOf.some((s) => s.type === "array");
        const hasObj = anyOf.some((s) => s.type === "object");
        const hasBool = anyOf.some((s) => s.type === "boolean");
        if (val === "null" && hasNull) {
          result[key] = null;
        } else if (hasBool) {
          result[key] = val === "true";
        } else if (hasArr || hasObj) {
          try {
            result[key] = JSON.parse(val);
          } catch { /* leave */ }
        } else if (hasInt) {
          const n = parseInt(val, 10);
          if (!isNaN(n)) result[key] = n;
        } else if (hasNum) {
          const n = parseFloat(val);
          if (!isNaN(n)) result[key] = n;
        }
      }
    }
  }
  return result;
}
