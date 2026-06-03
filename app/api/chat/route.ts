import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { createMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import type { ChatRequest, KiraProduct } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_TOOL_ROUNDS = 6;

// Cache the MCP tool list across requests so we skip the listTools() round-trip
// on every message. Schemas rarely change; refresh on a short TTL. We still open
// a fresh client per request for *calling* tools (connection reuse across
// serverless invocations is fragile).
let mcpToolsCache:
  | { tools: Awaited<ReturnType<typeof listMcpTools>>; ts: number }
  | null = null;
const MCP_TOOLS_TTL_MS = 5 * 60 * 1000;

const enc = new TextEncoder();
function sse(t: string, v?: unknown): Uint8Array {
  return enc.encode(
    `data: ${JSON.stringify(v !== undefined ? { t, v } : { t })}\n\n`
  );
}

const TOOL_STEPS: Record<string, string> = {
  kapruka_search_products: "Searching Kapruka catalog",
  kapruka_list_categories: "Browsing categories",
  kapruka_check_delivery: "Checking delivery availability",
  kapruka_get_product: "Getting product details",
  kapruka_create_order: "Placing your order",
};

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      let mcpClient: Awaited<ReturnType<typeof createMcpClient>> | undefined;
      // Per-request delivery cache — module scope would bleed quotes across users
      // on a warm serverless instance.
      const deliveryCacheStore = new Map<string, unknown>();

      try {
        const { messages, cart, deliveryCity } = body;

        const cartContext =
          cart.length > 0
            ? `\n\nCurrent cart: ${cart.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}`
            : "";
        const deliveryContext = deliveryCity
          ? `\nDelivery city: ${deliveryCity} (already confirmed — do not call check_delivery again for this city)`
          : "";

        mcpClient = await createMcpClient();
        let mcpTools: Awaited<ReturnType<typeof listMcpTools>>;
        if (mcpToolsCache && Date.now() - mcpToolsCache.ts < MCP_TOOLS_TTL_MS) {
          mcpTools = mcpToolsCache.tools;
        } else {
          mcpTools = await listMcpTools(mcpClient);
          mcpToolsCache = { tools: mcpTools, ts: Date.now() };
        }

        const trimDesc = (desc: string) =>
          desc.split(/\n/)[0].split(". ")[0].slice(0, 120);

        function relaxSchema(
          schema: Record<string, unknown>
        ): Record<string, unknown> {
          const props = schema.properties as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (!props) return schema;
          const relaxed = Object.fromEntries(
            Object.entries(props).map(([k, v]) => {
              if (v.type === "integer" || v.type === "number") {
                const { type: _t, ...rest } = v;
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
                const { type: _t, ...rest } = v;
                return [k, { ...rest, anyOf: [{ type: v.type }, { type: "string" }] }];
              }
              if (v.type === "boolean") {
                const { type: _t, ...rest } = v;
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

        function resolveSchema(rawSchema: Record<string, unknown>): {
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

        const toolMeta: { needsParamsWrap: boolean }[] = [];
        const tools: Groq.Chat.Completions.ChatCompletionTool[] = mcpTools.map(
          (tool) => {
            const raw = (tool.inputSchema as Record<string, unknown>) ?? {
              type: "object",
              properties: {},
            };
            const { schema, needsParamsWrap } = resolveSchema(raw);
            toolMeta.push({ needsParamsWrap });
            return {
              type: "function",
              function: {
                name: tool.name,
                description: trimDesc(tool.description ?? ""),
                parameters: relaxSchema(schema),
              },
            };
          }
        );

        type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

        const currentMessages: GroqMessage[] = [
          {
            role: "system",
            content: KIRA_SYSTEM_PROMPT + cartContext + deliveryContext,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        let finalText = "";
        const collectedProducts: KiraProduct[] = [];
        let payLink: string | undefined;

        const JSON_FORMAT_TOOLS = [
          "kapruka_search_products",
          "kapruka_list_categories",
          "kapruka_check_delivery",
          "kapruka_get_product",
          "kapruka_create_order",
        ];

        async function executeToolCalls(
          calls: Groq.Chat.Completions.ChatCompletionMessageToolCall[]
        ) {
          for (const toolCall of calls) {
            const toolName = toolCall.function.name;

            // Emit the thinking step for this tool
            controller.enqueue(
              sse("step", TOOL_STEPS[toolName] ?? "Using a tool")
            );

            let toolArgs: Record<string, unknown> = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch {
              /* malformed args */
            }

            if (JSON_FORMAT_TOOLS.includes(toolName)) {
              toolArgs = { ...toolArgs, response_format: "json" };
            }

            const toolIndex = mcpTools.findIndex((t) => t.name === toolName);
            const flatSchema =
              toolIndex >= 0
                ? (tools[toolIndex]?.function?.parameters as Record<string, unknown>)
                : null;
            if (flatSchema) toolArgs = coerceArgTypes(toolArgs, flatSchema);

            const needsWrap =
              toolIndex >= 0 && toolMeta[toolIndex]?.needsParamsWrap;
            const mcpArgs = needsWrap ? { params: toolArgs } : toolArgs;

            let resultText: string;
            try {
              if (toolName === "kapruka_check_delivery") {
                const city = String(toolArgs.city ?? "").toLowerCase().trim();
                if (city && deliveryCacheStore.has(city)) {
                  resultText = JSON.stringify(deliveryCacheStore.get(city));
                } else {
                  const toolResult = await callMcpTool(
                    mcpClient!,
                    toolName,
                    mcpArgs
                  );
                  resultText = JSON.stringify(toolResult.content);
                  if (city) deliveryCacheStore.set(city, toolResult.content);
                }
              } else {
                const toolResult = await callMcpTool(
                  mcpClient!,
                  toolName,
                  mcpArgs
                );
                resultText = JSON.stringify(toolResult.content);
              }
            } catch (mcpErr) {
              // MCP call failed — return error as tool result so the model can
              // respond gracefully rather than crashing the whole request.
              const msg = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
              resultText = JSON.stringify([{ type: "text", text: `Tool error: ${msg}` }]);
            }

            if (
              toolName === "kapruka_search_products" ||
              toolName === "kapruka_list_categories"
            ) {
              try {
                collectedProducts.push(
                  ...extractProducts(JSON.parse(resultText))
                );
              } catch {
                /* skip */
              }
            }
            if (toolName === "kapruka_create_order") {
              try {
                payLink = extractPayLink(JSON.parse(resultText));
              } catch {
                /* skip */
              }
            }

            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: resultText,
            });
          }
        }

        // Agentic loop (non-streaming — preserves failed_generation recovery)
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let response: Groq.Chat.Completions.ChatCompletion | undefined;

          try {
            response = await groq.chat.completions.create({
              model: MODEL,
              messages: currentMessages,
              tools: tools.length > 0 ? tools : undefined,
              tool_choice: tools.length > 0 ? "auto" : undefined,
              max_tokens: 512,
            });
          } catch (err) {
            const apiErr = err as {
              status?: number;
              error?: { code?: string; failed_generation?: string };
            };
            if (
              apiErr?.status === 400 &&
              apiErr?.error?.code === "tool_use_failed" &&
              apiErr?.error?.failed_generation
            ) {
              type RawCall = {
                name: string;
                parameters?: Record<string, unknown>;
              };
              let rawCalls: RawCall[] = [];
              try {
                rawCalls = JSON.parse(
                  apiErr.error.failed_generation
                ) as RawCall[];
              } catch {
                const match =
                  apiErr.error.failed_generation.match(/\[[\s\S]*\]/);
                if (match) {
                  try {
                    rawCalls = JSON.parse(match[0]) as RawCall[];
                  } catch {
                    /* unparseable */
                  }
                }
              }

              if (rawCalls.length > 0) {
                const fakeCalls: Groq.Chat.Completions.ChatCompletionMessageToolCall[] =
                  rawCalls.map((rc, i) => ({
                    id: `coerced-${round}-${i}`,
                    type: "function" as const,
                    function: {
                      name: rc.name,
                      arguments: JSON.stringify(rc.parameters ?? {}),
                    },
                  }));
                currentMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: fakeCalls,
                });
                await executeToolCalls(fakeCalls);
                continue;
              }
            }
            throw err;
          }

          const choice = response.choices[0];
          const msg = choice.message;

          if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
            const raw = msg.content ?? "";
            finalText = raw
              .replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "")
              .trim();
            break;
          }

          currentMessages.push({
            role: "assistant",
            content: msg.content,
            tool_calls: msg.tool_calls,
          });

          await executeToolCalls(msg.tool_calls);
        }

        // Fallback if all tool rounds were consumed without a text response
        if (!finalText) {
          finalText = "Aiyo, I ran out of time processing that. Can you try again?";
        }

        // Stream the final text word-by-word for a live typing effect
        const words = finalText.match(/\S+\s*/g) ?? [];
        for (const word of words) {
          controller.enqueue(sse("token", word));
          await new Promise((r) => setTimeout(r, 18));
        }

        // Dedup by id (searches across rounds can repeat products) and cap the
        // carousel so a multi-search turn doesn't flood the UI.
        const seenIds = new Set<string>();
        const dedupedProducts = collectedProducts
          .filter((p) => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          })
          .slice(0, 6);
        if (dedupedProducts.length > 0)
          controller.enqueue(sse("products", dedupedProducts));
        if (payLink) controller.enqueue(sse("payLink", payLink));
        controller.enqueue(sse("done"));
        controller.close();
      } catch (error) {
        console.error("Chat API error:", error);
        controller.enqueue(
          sse("error", "Aiyo, something went wrong on my end. Try again in a sec?")
        );
        controller.close();
      } finally {
        if (mcpClient) {
          try {
            await mcpClient.close();
          } catch {
            /* ignore */
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function coerceArgTypes(
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
        } catch {
          /* leave */
        }
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
          } catch {
            /* leave */
          }
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

function extractProducts(data: unknown): KiraProduct[] {
  let inner = data;
  if (Array.isArray(data)) {
    const textBlock = (data as { type: string; text: string }[]).find(
      (b) => b.type === "text"
    );
    if (textBlock) {
      try {
        inner = JSON.parse(textBlock.text);
      } catch {
        return [];
      }
    }
  }
  if (!inner || typeof inner !== "object") return [];
  const obj = inner as Record<string, unknown>;
  const candidates =
    (obj.results as unknown[]) ?? (Array.isArray(inner) ? inner : []);

  return candidates
    .slice(0, 4)
    .map((item) => {
      const p = item as Record<string, unknown>;
      const priceObj = p.price as { amount?: number; currency?: string } | undefined;
      const catObj = p.category as { name?: string } | undefined;
      return {
        id: String(p.id ?? Math.random()),
        name: String(p.name ?? "Product"),
        price: Number(priceObj?.amount ?? 0),
        currency: priceObj?.currency ?? "LKR",
        image: p.image_url as string | undefined,
        category: catObj?.name as string | undefined,
        url: p.url as string | undefined,
      };
    })
    .filter((p) => p.price > 0);
}

function extractPayLink(data: unknown): string | undefined {
  let inner = data;
  if (Array.isArray(data)) {
    const textBlock = (data as { type: string; text: string }[]).find(
      (b) => b.type === "text"
    );
    if (textBlock) {
      try {
        inner = JSON.parse(textBlock.text);
      } catch {
        return undefined;
      }
    }
  }
  if (!inner || typeof inner !== "object") return undefined;
  const obj = inner as Record<string, unknown>;
  return (obj.checkout_url as string) ?? undefined;
}
