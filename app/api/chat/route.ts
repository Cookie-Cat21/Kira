import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { createMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import {
  extractCheckoutInfoFromMcp,
  extractDeliveryInfoFromMcp,
  extractProductsFromMcp,
  extractTrackingFromMcp,
  formatMcpContentForModel,
  parseMcpPayload,
} from "@/lib/mcp-parsing";
import type { CartItem, ChatRequest, CheckoutInfo, KiraProduct } from "@/types";

let _groq: Groq | undefined;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
  return _groq;
}
// Free-tier model cascade: most capable first, fall back on 429.
//   1. Llama 3.3 70B  — best personality, 100k tokens/day free budget
//   2. Llama 4 Scout  — generous 30k TPM headroom
//   3. Llama 3.1 8B   — highest free limits, last resort
const MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant",
];
const MAX_TOOL_ROUNDS = 5;

const SERVER_CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

const CATEGORY_QUERY_MAP: Record<string, string> = {
  cakes: "cake",
  cake: "cake",
  flowers: "roses",
  flower: "roses",
  chocolates: "chocolate",
  chocolate: "chocolate",
  electronics: "electronics",
  fashion: "fashion",
  hampers: "gift hamper",
  hamper: "gift hamper",
};

// Cache the MCP tool list across requests (schemas rarely change).
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
  kapruka_list_delivery_cities: "Resolving delivery city",
  kapruka_track_order: "Tracking your order",
};

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      let mcpClient: Awaited<ReturnType<typeof createMcpClient>> | undefined;
      // Per-request delivery cache — keyed by city|date|product to avoid
      // cross-contaminating date-specific quotes across calls.
      const deliveryCacheStore = new Map<string, unknown>();

      try {
        const { messages, cart, deliveryCity, deliveryDate } = body;
        const latestUserText =
          [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        const cartContext =
          cart.length > 0
            ? `\n\nCurrent cart: ${cart.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}`
            : "";
        const deliveryContext = deliveryCity
          ? `\nDelivery city: ${deliveryCity} (already confirmed — do not call check_delivery again for this city unless a product or date is now available)`
          : "";
        const deliveryDateContext = deliveryDate
          ? `\nRequested delivery date: ${deliveryDate} — always pass this date as delivery_date when calling kapruka_check_delivery and kapruka_create_order.`
          : "";

        mcpClient = await createMcpClient();
        if (
          await tryHandleDeterministicPrompt({
            text: latestUserText,
            messages,
            cart,
            deliveryCity,
            deliveryDate,
            mcpClient,
            controller,
          })
        ) {
          controller.close();
          return;
        }

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
            content: KIRA_SYSTEM_PROMPT + cartContext + deliveryContext + deliveryDateContext,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        let finalText = "";
        const collectedProducts: KiraProduct[] = [];
        let checkoutInfo: CheckoutInfo | undefined;
        let payLink: string | undefined;
        let modelIndex = 0;

        const JSON_FORMAT_TOOLS = [
          "kapruka_search_products",
          "kapruka_list_categories",
          "kapruka_check_delivery",
          "kapruka_get_product",
          "kapruka_create_order",
          "kapruka_list_delivery_cities",
          "kapruka_track_order",
        ];

        async function executeToolCalls(
          calls: Groq.Chat.Completions.ChatCompletionMessageToolCall[]
        ) {
          for (const toolCall of calls) {
            const toolName = toolCall.function.name;

            // Parse args first so we can use them in the step label and context SSE
            let toolArgs: Record<string, unknown> = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch { /* malformed args */ }

            // Step label — include search query for visibility
            let stepLabel = TOOL_STEPS[toolName] ?? "Using a tool";
            if (toolName === "kapruka_search_products") {
              const q = String(toolArgs.q ?? "").trim();
              if (q) stepLabel = `Searching Kapruka for "${q}"`;
            }
            controller.enqueue(sse("step", stepLabel));

            // Emit grounded budget context so the commerce rail updates
            if (toolName === "kapruka_search_products") {
              const maxPrice = toolArgs.max_price ?? toolArgs.maxPrice;
              if (maxPrice != null) {
                const num = Number(maxPrice);
                if (!isNaN(num) && num > 0)
                  controller.enqueue(
                    sse("context", { budget: `Under LKR ${num.toLocaleString("en-LK")}` })
                  );
              }
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

            let resultContent: unknown;
            try {
              if (toolName === "kapruka_check_delivery") {
                const city = String(toolArgs.city ?? "").toLowerCase().trim();
                const date = String(toolArgs.delivery_date ?? "").trim();
                const product = String(toolArgs.product_id ?? "").trim();
                const cacheKey = `${city}|${date}|${product}`;
                if (city && deliveryCacheStore.has(cacheKey)) {
                  resultContent = deliveryCacheStore.get(cacheKey);
                } else {
                  const toolResult = await callMcpTool(mcpClient!, toolName, mcpArgs);
                  resultContent = toolResult.content;
                  if (city) deliveryCacheStore.set(cacheKey, toolResult.content);
                }
              } else {
                const toolResult = await callMcpTool(mcpClient!, toolName, mcpArgs);
                resultContent = toolResult.content;
              }
            } catch (mcpErr) {
              const msg = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
              resultContent = [{ type: "text", text: `Tool error: ${msg}` }];
            }

            const resultText = formatMcpContentForModel(resultContent);

            if (toolName === "kapruka_check_delivery") {
              const deliveryInfo = extractDeliveryInfoFromMcp(resultContent);
              if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
            }
            if (
              toolName === "kapruka_search_products" ||
              toolName === "kapruka_list_categories"
            ) {
              collectedProducts.push(...extractProductsFromMcp(resultContent));
            }
            if (toolName === "kapruka_create_order") {
              checkoutInfo = extractCheckoutInfoFromMcp(resultContent);
              payLink = checkoutInfo?.checkoutUrl;
            }
            if (toolName === "kapruka_track_order") {
              const tracking = extractTrackingFromMcp(resultContent);
              if (tracking) controller.enqueue(sse("tracking", tracking));
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
            // Last-resort model has tight TPM — drop tool schemas so the request fits.
            // Inject a system note so it doesn't hallucinate product results.
            const isLastModel = modelIndex === MODELS.length - 1;
            const reqTools = !isLastModel && tools.length > 0 ? tools : undefined;
            const reqMessages = isLastModel
              ? [
                  {
                    ...currentMessages[0],
                    content:
                      (currentMessages[0].content as string) +
                      "\n\nIMPORTANT: You currently have NO access to the Kapruka catalog. Do NOT invent, list, or describe any products, prices, or availability. Instead tell the user you're having trouble connecting to Kapruka right now and ask them to try again in a moment.",
                  },
                  ...currentMessages.slice(1),
                ]
              : currentMessages;
            response = await getGroq().chat.completions.create({
              model: MODELS[modelIndex],
              messages: reqMessages,
              tools: reqTools,
              tool_choice: reqTools ? "auto" : undefined,
              max_tokens: 512,
            });
          } catch (err) {
            type ErrBody = { code?: string; failed_generation?: string };
            const apiErr = err as {
              status?: number;
              error?: ErrBody & { error?: ErrBody };
            };
            const inner: ErrBody = apiErr?.error?.error ?? apiErr?.error ?? {};

            if (apiErr?.status === 429 || apiErr?.status === 413) {
              if (modelIndex < MODELS.length - 1) {
                modelIndex++;
                round--;
                continue;
              }
              // All models rate-limited or request too large — graceful in-character message
              finalText =
                "Aiyo, I'm a bit slammed right now — all my thinking servers are busy 🙏 Give me a minute and try again?";
              break;
            }
            if (
              apiErr?.status === 400 &&
              inner.code === "tool_use_failed" &&
              inner.failed_generation
            ) {
              type RawCall = {
                name: string;
                parameters?: Record<string, unknown>;
              };
              let rawCalls: RawCall[] = [];
              try {
                rawCalls = JSON.parse(inner.failed_generation) as RawCall[];
              } catch {
                const match = inner.failed_generation.match(/\[[\s\S]*\]/);
                if (match) {
                  try {
                    rawCalls = JSON.parse(match[0]) as RawCall[];
                  } catch { /* unparseable */ }
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

        if (!finalText) {
          finalText = "Aiyo, I ran out of time processing that. Can you try again?";
        }

        // Stream final text word-by-word for typing effect
        const words = finalText.match(/\S+\s*/g) ?? [];
        for (const word of words) {
          controller.enqueue(sse("token", word));
          await new Promise((r) => setTimeout(r, 18));
        }

        // Dedup + cap carousel
        const seenIds = new Set<string>();
        const dedupedProducts = collectedProducts
          .filter((p) => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          })
          .slice(0, 8);
        if (dedupedProducts.length > 0)
          controller.enqueue(sse("products", dedupedProducts));
        if (checkoutInfo) controller.enqueue(sse("checkout", checkoutInfo));
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
          } catch { /* ignore */ }
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

// Matches short "show me" / "can i see them" re-show requests with no product query.
const RESHOW_RE = /^(show\s*(me|them|these)?|can\s+i\s+see(\s+them)?|let\s+me\s+see(\s+them)?)[\.\?\!]?$/i;

async function tryHandleDeterministicPrompt({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  mcpClient,
  controller,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  mcpClient: Awaited<ReturnType<typeof createMcpClient>>;
  controller: ReadableStreamDefaultController<Uint8Array>;
}): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) return false;

  const wantsTracking =
    lower.includes("track") && (lower.includes("order") || lower.includes("delivery"));
  if (wantsTracking) {
    const orderNumber = extractOrderNumber(trimmed);
    if (!orderNumber) {
      await streamWords(
        controller,
        "Sure — send me the Kapruka order number from the confirmation email, and I’ll check the status for you."
      );
    } else {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_track_order));
      const trackingResult = await callMcpTool(mcpClient, "kapruka_track_order", {
        params: {
          order_number: orderNumber,
          response_format: "json",
        },
      });
      const tracking = extractTrackingFromMcp(trackingResult.content);
      if (tracking) {
        await streamWords(
          controller,
          `I found order ${tracking.orderNumber || orderNumber}: ${tracking.statusDisplay || tracking.currentStatus}.`
        );
        controller.enqueue(sse("tracking", tracking));
      } else {
        const parsed = parseMcpPayload(trackingResult.content);
        const reason = parsed.ok ? "I couldn’t read the tracking details." : parsed.error;
        await streamWords(
          controller,
          `I couldn’t track ${orderNumber}. ${reason}`
        );
      }
    }
    controller.enqueue(sse("done"));
    return true;
  }

  if (lower.includes("ready to checkout") || lower.includes("complete the order")) {
    const message =
      cart.length === 0
        ? "Add a product first and I’ll help you checkout."
        : "Lovely. Before I create a live Kapruka checkout link, I need the recipient’s full name.";
    await streamWords(controller, message);
    controller.enqueue(sse("done"));
    return true;
  }

  // Re-show request: "show me" / "can i see them" with no product specified.
  // Re-run the last search from conversation history so the carousel appears.
  if (trimmed.split(/\s+/).length <= 5 && RESHOW_RE.test(trimmed)) {
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}"`));
    const reshowResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const reshowProducts = dedupeProducts(extractProductsFromMcp(reshowResult.content));
    if (reshowProducts.length === 0) {
      await streamWords(
        controller,
        `I checked Kapruka live but nothing's in stock right now. Want to try a different search?`
      );
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        `Here you go${budgetText} — ${reshowProducts.length} pick${reshowProducts.length === 1 ? "" : "s"} from Kapruka.`
      );
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "More options" handler — re-search with a different sort or broader query.
  // Only fires when the message is short and has no specific product keyword.
  const MORE_PRODUCT_KW =
    /\b(cake|cakes|flower|flowers|chocolate|chocolates|hamper|toy|toys|fashion|electronics|phone|gift|roses|bouquet|dress|shirt|gadget)\b/i;
  const MORE_RE_PATTERN =
    /\b(more|other options?|different|something else|other picks?|another option|alternatives?|see more|show more)\b/i;
  const isPureMoreRequest =
    MORE_RE_PATTERN.test(lower) &&
    trimmed.split(/\s+/).length <= 7 &&
    !MORE_PRODUCT_KW.test(trimmed);

  if (isPureMoreRequest) {
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}" (price ↑)`));
    const moreResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        sort: "price_asc", // different angle from the default bestseller ordering
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const moreProducts = dedupeProducts(extractProductsFromMcp(moreResult.content));

    if (moreProducts.length === 0) {
      await streamWords(
        controller,
        `Hmm, nothing else in stock on Kapruka right now — want to try a different category?`
      );
    } else if (moreProducts.length <= 3) {
      await streamWords(
        controller,
        `These are all the ${ctx.query} picks Kapruka has in stock at the moment. Want me to try a different category or remove the budget filter?`
      );
      controller.enqueue(sse("products", moreProducts));
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        `Here are ${moreProducts.length} more picks${budgetText}, sorted by price ↑`
      );
      controller.enqueue(sse("products", moreProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  const searchIntent = parseSearchIntent(trimmed);
  if (!searchIntent) return false;

  controller.enqueue(sse("step", `Searching Kapruka for "${searchIntent.query}"`));
  let products: KiraProduct[] = [];
  let usedQuery = searchIntent.query;

  for (const query of [searchIntent.query, fallbackQuery(searchIntent.query)]) {
    if (!query) continue;
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: query,
        limit: 6,
        in_stock_only: true,
        ...(searchIntent.maxPrice ? { max_price: searchIntent.maxPrice } : {}),
        ...(searchIntent.sort ? { sort: searchIntent.sort } : {}),
        response_format: "json",
      },
    });
    products = dedupeProducts(extractProductsFromMcp(searchResult.content));
    usedQuery = query;
    if (products.length > 0) break;
  }

  let deliveryCityForMessage = deliveryCity;
  const cityHint = extractCityHint(trimmed) ?? deliveryCity;
  const effectiveDate = deliveryDate ?? searchIntent.deliveryDate;
  if (cityHint && products[0]) {
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
    const cityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
      params: {
        query: cityHint,
        limit: 3,
        response_format: "json",
      },
    });
    const canonicalCity = extractFirstCity(cityResult.content) ?? cityHint;
    deliveryCityForMessage = canonicalCity;

    controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
    const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
      params: {
        city: canonicalCity,
        ...(effectiveDate ? { delivery_date: effectiveDate } : {}),
        product_id: products[0].id,
        response_format: "json",
      },
    });
    const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
    if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
  }

  if (products.length === 0) {
    await streamWords(
      controller,
      `I checked Kapruka live, but couldn’t find in-stock products for “${searchIntent.query}” right now. Try a broader term?`
    );
  } else {
    const budgetText = searchIntent.maxPrice
      ? ` under LKR ${searchIntent.maxPrice.toLocaleString("en-LK")}`
      : "";
    const cityText = deliveryCityForMessage ? ` for ${deliveryCityForMessage}` : "";
    const dateText = effectiveDate ? ` on ${effectiveDate}` : "";
    await streamWords(
      controller,
      `Found ${products.length} live Kapruka pick${products.length === 1 ? "" : "s"} for ${usedQuery}${budgetText}${cityText}${dateText}.`
    );
    controller.enqueue(sse("products", products));
  }

  controller.enqueue(sse("done"));
  return true;
}

// Scan recent user messages to find what was last searched (query + budget).
// Used by the re-show deterministic handler when the user says "show me" / "can i see them".
function extractLastSearchContext(
  messages: { role: string; content: string }[],
  currentText: string
): { query: string; maxPrice?: number } {
  let query = "gift";
  let maxPrice: number | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (msg.content === currentText) continue; // skip the current "show me" message

    // Try the standard search intent parser first
    const intent = parseSearchIntent(msg.content);
    if (intent) return { query: intent.query, maxPrice: intent.maxPrice };

    // Extract first plausible LKR amount (200–99999)
    const nums = msg.content.match(/\b([\d,]{3,6})\b/g)
      ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
      .filter((n) => n >= 200 && n <= 99999);
    if (nums?.length) maxPrice = nums[0];

    // Match product category keywords
    const msgLow = msg.content.toLowerCase();
    if (/\bcake\b/.test(msgLow)) { query = "cake"; break; }
    if (/\bflower/.test(msgLow)) { query = "roses"; break; }
    if (/\bchocolat/.test(msgLow)) { query = "chocolate"; break; }
    if (/\bhamper\b/.test(msgLow)) { query = "gift hamper"; break; }
    if (/\btoy\b/.test(msgLow)) { query = "toy"; break; }
    if (/\bfashion|clothing\b/.test(msgLow)) { query = "fashion"; break; }
    if (/\belectronic|phone|gadget\b/.test(msgLow)) { query = "electronics"; break; }

    // Stop if we at least found a price
    if (maxPrice !== undefined) break;
  }

  return { query, maxPrice };
}

function dedupeProducts(products: KiraProduct[]): KiraProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = (product.id || product.url || product.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSearchIntent(text: string):
  | {
      query: string;
      maxPrice?: number;
      sort?: "price_asc" | "price_desc" | "bestseller";
      deliveryDate?: string;
    }
  | null {
  const lower = text.toLowerCase();
  const isSearchy =
    lower.includes("show me") ||
    lower.includes("search") ||
    lower.includes("catalog") ||
    lower.includes("kapruka");
  if (!isSearchy) return null;

  const categoryMatch = lower.match(/show me ([a-z\s&]+?) on kapruka/);
  const forMatch = lower.match(/(?:for|catalog for) ([a-z\s&]+?)(?: under| below| to | in stock|\.|$)/);
  const rawQuery =
    categoryMatch?.[1]?.trim() ??
    forMatch?.[1]?.trim() ??
    lower
      // strip intent/meta words that are NOT product names
      .replace(/search|kapruka|live|catalog|show me|show us|in stock|available|products?|product cards|if available|listings?|picks?|pics?|pictures?|photos?|options?|items?|stuff/gi, " ")
      // strip common prepositions and noise words that survive the first pass
      .replace(/\b(more|some|any|all|the|of|for|with|to|a|an|me|us)\b/gi, " ")
      .replace(/\bunder\s+\d[\d,]*/gi, " ")
      .replace(SERVER_CITY_REGEX, " ")
      .replace(/\s+/g, " ")
      .trim();

  const query = normalizeProductQuery(rawQuery);
  if (!query || query.length < 3) return null;

  const priceMatch = lower.match(/\b(?:under|below|max|maximum)\s+(?:lkr\s*)?([\d,]+)/);
  const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
  const sort = lower.includes("popular") || lower.includes("best")
    ? "bestseller"
    : lower.includes("cheap")
    ? "price_asc"
    : undefined;
  const deliveryDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];

  return { query, maxPrice, sort, deliveryDate };
}

function normalizeProductQuery(raw: string): string {
  const compact = raw
    .replace(/[^a-z0-9\s&]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/i, "") // strip leading articles: "the cake" → "cake"
    .trim();
  return CATEGORY_QUERY_MAP[compact] ?? compact;
}

function fallbackQuery(query: string): string | undefined {
  if (query === "flowers") return "roses";
  if (query === "cake") return "cakes";
  if (query === "fashion") return "shirt";
  if (query === "electronics") return "phone";
  return undefined;
}

function extractCityHint(text: string): string | undefined {
  const match = text.match(SERVER_CITY_REGEX);
  return match?.[1]?.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFirstCity(content: unknown): string | undefined {
  const parsed = formatMcpContentForModel(content);
  try {
    const data = JSON.parse(parsed) as { cities?: { name?: string }[] };
    return data.cities?.[0]?.name;
  } catch {
    return undefined;
  }
}

function extractOrderNumber(text: string): string | undefined {
  return text.match(/\b[A-Z]{2,}[A-Z0-9]{5,}\b/i)?.[0]?.toUpperCase();
}

async function streamWords(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string
) {
  const words = text.match(/\S+\s*/g) ?? [];
  for (const word of words) {
    controller.enqueue(sse("token", word));
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
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
