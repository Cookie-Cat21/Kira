/** Strip model tool-call markup that must never reach the user. */

/** Standard XML-ish: `<function=name>...</function>` */
const TOOL_BLOCK_RE = /<function=[^>]*>[\s\S]*?<\/function>/gi;
/** Groq text leak: `<function=kapruka_search_products{"q":"cake"}></function>` (no `>` before `{`) */
const TOOL_INLINE_JSON_RE = /<function=(\w+)\s*(\{[\s\S]*?\})\s*><\/function>/gi;
/** Trailing partial markup while streaming */
const TOOL_PARTIAL_TAIL_RE = /<function(?:=[\w.]*)?(?:[\s\S]*)?$/i;
const TOOL_OPEN_TAIL_RE = /<function=[^>]*>\{[\s\S]*$/gi;
const TOOL_OPEN_RE = /<function=[^>]*>/gi;
const TOOL_CLOSE_RE = /<\/function>/gi;
const KAPRUKA_JSON_BLOB_RE = /kapruka_\w+>\s*\{[\s\S]*?\}/gi;

function applyToolStripPasses(text: string): string {
  return text
    .replace(TOOL_INLINE_JSON_RE, "")
    .replace(TOOL_BLOCK_RE, "")
    .replace(KAPRUKA_JSON_BLOB_RE, "")
    .replace(TOOL_OPEN_TAIL_RE, "")
    .replace(TOOL_OPEN_RE, "")
    .replace(TOOL_CLOSE_RE, "");
}

export function sanitizeAssistantText(text: string): string {
  return applyToolStripPasses(text ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasToolMarkupLeak(text: string): boolean {
  return (
    /<function=/i.test(text ?? "") ||
    /kapruka_\w+>\s*\{/i.test(text ?? "") ||
    /"\s*in_stock_only\s*":/i.test(text ?? "")
  );
}

/** Parse tool calls the model leaked as plain text instead of structured tool_calls. */
export function parseTextToolCalls(
  text: string
): { name: string; arguments: string }[] {
  const calls: { name: string; arguments: string }[] = [];
  for (const m of (text ?? "").matchAll(TOOL_INLINE_JSON_RE)) {
    calls.push({ name: m[1], arguments: m[2] });
  }
  return calls;
}

/**
 * Buffers streaming tokens so partial `<function=...` markup never reaches the client.
 */
export class StreamingTextSanitizer {
  private carry = "";

  push(chunk: string): string {
    this.carry += chunk;
    this.carry = applyToolStripPasses(this.carry);

    const partial = this.carry.search(TOOL_PARTIAL_TAIL_RE);
    if (partial >= 0) {
      const emit = this.carry.slice(0, partial);
      this.carry = this.carry.slice(partial);
      return emit;
    }

    const emit = this.carry;
    this.carry = "";
    return emit;
  }

  flush(): string {
    const out = sanitizeAssistantText(this.carry);
    this.carry = "";
    return out;
  }
}

/** Generic carousel intros that score poorly on founder review. */
export const GENERIC_CAROUSEL_COPY_RE =
  /^here are \d+ picks\b|here are kapruka'?s top picks right now/i;

export function hasGenericCarouselCopy(text: string): boolean {
  return GENERIC_CAROUSEL_COPY_RE.test((text ?? "").trim());
}
