import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { getMcpClient, invalidateMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
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
const MAX_TOOL_ROUNDS = 4;

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

// Common misspellings corrected before hitting MCP search.
const SEARCH_SPELLING_MAP: Record<string, string> = {
  stationary: "stationery",
  jewllery: "jewellery",
  jewlery: "jewellery",
  jewlry: "jewellery",
  choclate: "chocolate",
  chocalate: "chocolate",
  baloons: "balloons",
  ballon: "balloon",
  teddybear: "teddy bear",
};

// ─── Localized UI strings ────────────────────────────────────────────────────
// All fixed-text messages surfaced to users, in en / si / ta.
// Use L(key, lang) for static strings, Lf(key, lang, vars) for templated ones.
const LS: Record<string, Record<string, string>> = {
  trackingAskOrderNumber: {
    en: "Sure — send me the Kapruka order number from the confirmation email, and I'll check the status for you.",
    si: "හොඳයි — confirmation email එකෙන් Kapruka order number එක දෙන්නකෝ, status check කරන්නම්.",
    ta: "சரி — confirmation email-இல் உள்ள Kapruka ஆர்டர் எண்ணை அனுப்புங்கள், நான் status பார்க்கிறேன்.",
  },
  trackingFound: {
    en: "I found order {orderNumber}: {status}.",
    si: "Order {orderNumber} හොයාගත්තා: {status}.",
    ta: "Order {orderNumber} கிடைத்தது: {status}.",
  },
  trackingNotFound: {
    en: "I couldn't track {orderNumber}. {reason}",
    si: "Order {orderNumber} track කරන්නේ බෑ. {reason}",
    ta: "Order {orderNumber} track செய்ய முடியவில்லை. {reason}",
  },
  checkoutEmptyCart: {
    en: "Add a product first and I'll help you checkout.",
    si: "පළමුව product එකක් add කරන්නකෝ, ඊට පස්සේ checkout කරමු.",
    ta: "முதலில் ஒரு பொருளை சேர்க்கவும், பிறகு checkout செய்யலாம்.",
  },
  checkoutNeedName: {
    en: "Lovely. Before I create a live Kapruka checkout link, I need the recipient's full name.",
    si: "හොඳයි! Live Kapruka checkout link හදන්න recipient ගේ full name ඕනෑ.",
    ta: "நல்லது! Live Kapruka checkout link உருவாக்க recipient இன் full name தேவை.",
  },
  reshowNothingInStock: {
    en: "Checked Kapruka again — nothing in stock right now. Want to try a different category or search?",
    si: "Kapruka නැවත check කළා — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka மீண்டும் சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowNothingFoundQuery: {
    en: "I checked Kapruka live for \"{query}\" — nothing in stock right now. Want to try a different category?",
    si: "Kapruka check කළා \"{query}\" — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka-ல் \"{query}\" சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowRealListings: {
    en: "Here are the real listings{budget} from Kapruka — {n} in stock right now.",
    si: "Kapruka real listings{budget} — {n} stock හිඳිනා.",
    ta: "Kapruka உண்மையான listings{budget} — {n} stock இல் உள்ளவை.",
  },
  reshowHereYouGo: {
    en: "Here you go{budget}! {n} picks from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka options {n}.",
    ta: "இதோ{budget}! Kapruka-இல் {n} options.",
  },
  reshowHereYouGoOne: {
    en: "Here you go{budget}! One pick from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka option.",
    ta: "இதோ{budget}! Kapruka-இல் ஒரு option.",
  },
  reshowHereItems: {
    en: "Here they are — {n} items with pictures.",
    si: "ඒ items {n} — pictures සමග.",
    ta: "இதோ {n} items — pictures உடன்.",
  },
  reshowHereItemsSingle: {
    en: "Here it is — the item with pictures.",
    si: "ඒ item — picture සමග.",
    ta: "இதோ item — picture உடன்.",
  },
  moreOptionsSamePicks: {
    en: "Hmm, Kapruka's showing the same picks — want to try a different category or price range?",
    si: "Hmm, Kapruka ම picks — වෙනත් category හෝ price range try කරමුද?",
    ta: "Hmm, Kapruka அதே picks — வேறு category அல்லது price range try செய்யலாமா?",
  },
  moreOptionsAboutAll: {
    en: "Honestly, that's about all Kapruka has for {query} right now. Want to try a different category or drop the budget filter?",
    si: "Honestly, Kapruka {query} — ඒ ඒවාමයි. Category change කරමුද?",
    ta: "Honestly, Kapruka-இல் {query} க்கு இவை மட்டுமே. வேறு category try செய்யலாமா?",
  },
  moreOptionsHere: {
    en: "Here are some more options{budget} — sorted by price this time.",
    si: "More options{budget} — price order.",
    ta: "மேலும் options{budget} — price வரிசையில்.",
  },
  searchNothingFound: {
    en: "Checked Kapruka live - nothing in stock for \"{query}\" right now. Want me to try a different term or category?",
    si: "Kapruka check කළා — \"{query}\" stock නෑ. වෙනත් term try කරමුද?",
    ta: "Kapruka சரிபார்த்தேன் — \"{query}\" stock இல்லை. வேறு term try செய்யலாமா?",
  },
  searchFoundOne: {
    en: "Found one option{budget}{city}{date} — here's what's in stock:",
    si: "Option 1{budget}{city}{date} — stock හිඳිනා:",
    ta: "ஒரு option{budget}{city}{date} — stock இல் உள்ளது:",
  },
  searchFoundMany: {
    en: "Here are {n} picks{budget}{city}{date} — all in stock on Kapruka right now.",
    si: "Kapruka {n} options{budget}{city}{date} — stock හිඳිනා.",
    ta: "Kapruka-இல் {n} options{budget}{city}{date} — stock இல் உள்ளவை.",
  },
  rateExhausted: {
    en: "Aiyo, I'm a bit slammed right now — all my thinking servers are busy 🙏 Give me a minute and try again?",
    si: "Aiyo, දැන් ටිකක් busy — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ 🙏",
    ta: "Aiyo, இப்போது கொஞ்சம் busy — ஒரு நிமிடம் கழித்து try செய்யுங்கள் 🙏",
  },
  stagnantFallback: {
    en: "Aiyo, I'm having a bit of trouble finding that right now — could you try rephrasing?",
    si: "Aiyo, ඒක හොයාගන්නේ ටිකක් problem — rephrasing කරලා try කරන්නකෝ.",
    ta: "Aiyo, அதை கண்டுபிடிக்க சிறு சிரமம் — வேறு விதமாக சொல்லி try செய்யுங்கள்.",
  },
  timeoutFallback: {
    en: "Aiyo, I ran out of time processing that. Can you try again?",
    si: "Aiyo, ටිකක් problem — නැවත try කරන්නකෝ.",
    ta: "Aiyo, சிறு பிரச்சனை — மீண்டும் try செய்யுங்கள்.",
  },
  troubleConnecting: {
    en: "I'm having a bit of trouble reaching Kapruka right now — please try again in a moment and I'll find real options for you.",
    si: "Kapruka connect කරන්නේ ටිකක් problem — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ.",
    ta: "Kapruka இணைப்பில் சிறு பிரச்சனை — கொஞ்சம் நேரம் கழித்து மீண்டும் try செய்யுங்கள்.",
  },
};

function L(key: string, lang: string): string {
  const map = LS[key];
  if (!map) return key;
  return map[lang] ?? map.en ?? key;
}

function Lf(key: string, lang: string, vars: Record<string, string | number>): string {
  let str = L(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

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
      let mcpClient: Awaited<ReturnType<typeof getMcpClient>> | undefined;
      // Per-request delivery cache — keyed by city|date|product to avoid
      // cross-contaminating date-specific quotes across calls.
      const deliveryCacheStore = new Map<string, unknown>();

      try {
        const { messages, cart, deliveryCity, deliveryDate, lastProducts } = body;
        const language: string = body.language ?? "en";
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

        mcpClient = await getMcpClient();
        if (
          await tryHandleDeterministicPrompt({
            text: latestUserText,
            messages,
            cart,
            deliveryCity,
            deliveryDate,
            lastProducts,
            language,
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

        // Context compaction: keep a verbatim sliding window of recent turns and
        // prepend a structural summary of older turns so Kira retains cross-turn
        // memory (budget, city, occasion, shown products) without bloating context.
        const HISTORY_WINDOW = 8;   // recent turns always kept verbatim
        const COMPACT_THRESHOLD = 12; // compact when history exceeds this
        const recentMessages = messages.slice(-HISTORY_WINDOW);
        const olderMessages =
          messages.length > COMPACT_THRESHOLD
            ? messages.slice(0, -HISTORY_WINDOW)
            : [];
        const compactSummary =
          olderMessages.length > 0 ? buildCompactSummary(olderMessages) : "";

        // Explicit language instruction — no guessing needed.
        // The user's selector controls response language only; Kira always
        // understands input in any script (Sinhala Unicode, Romanized Sinhala,
        // Tanglish, English). Fallback models ignore script-detection heuristics
        // and hallucinate garbled Sinhala, so we lock the output language here.
        const langInstruction =
          language === "si"
            ? "\n\nIMPORTANT — LANGUAGE: You MUST respond entirely in Sinhala script (Unicode, U+0D80–U+0DFF). Every word of your response must be written in Sinhala Unicode characters. Do NOT use Latin script, Romanized Sinhala, or English in your response. You can understand input in any language or script — only your RESPONSES must be in Sinhala Unicode."
            : language === "ta"
            ? "\n\nIMPORTANT — LANGUAGE: You MUST respond primarily in Tamil script (Unicode, U+0B80–U+0BFF). Tamil Unicode characters must appear in every response — do not respond in pure English. For product names or individual words you cannot write in Tamil, you may include the English word; but frame the sentence in Tamil. NEVER use Sinhala Unicode (U+0D80–U+0DFF) — Sinhala and Tamil are completely different scripts. Example of acceptable format: 'Kapruka-இல் 3 options — stock-இல் உள்ளவை.'"
            : "\n\nIMPORTANT — LANGUAGE: You MUST respond in English or Tanglish. Tanglish means casual English mixed with ROMANIZED Sinhala/Tamil words only (e.g. 'aiyo', 'machang', 'amma', 'podi', 'nona') — NOT Unicode script. Under NO circumstances write Sinhala Unicode (U+0D80–U+0DFF) or Tamil Unicode (U+0B80–U+0BFF) characters, even if the user writes in those scripts. The selected language mode OVERRIDES the input script.";

        // Authoritative per-request date. KIRA_SYSTEM_PROMPT bakes `new Date()` at
        // module-load time, which goes stale after a cold start; this line is
        // evaluated on every request and overrides it for delivery-date logic.
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86_400_000);
        const dateContext =
          `\n\n[CURRENT DATE: ${today.toISOString().slice(0, 10)} — treat this as today for ALL delivery-date logic. ` +
          `Delivery date must be today or later; if the user gives no date, default to tomorrow (${tomorrow.toISOString().slice(0, 10)}) and confirm.]`;

        const systemContent =
          KIRA_SYSTEM_PROMPT +
          cartContext +
          deliveryContext +
          deliveryDateContext +
          dateContext +
          langInstruction +
          (compactSummary ? `\n\n${compactSummary}` : "");

        const mappedRecent = recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // EN mode: always prepend a hard script lock on the latest user message.
        // The lock is ~15 tokens and prevents the model from code-switching to Sinhala/Tamil
        // Unicode when it recognises cultural keywords (Vesak, amma, avurudu, etc.).
        // Without this, Llama infers a "Sinhala-speaker context" from topic words alone and
        // replies in Unicode even when the system prompt says otherwise.
        if (language === "en") {
          const lastIdx = mappedRecent.length - 1;
          if (lastIdx >= 0 && mappedRecent[lastIdx].role === "user") {
            mappedRecent[lastIdx] = {
              ...mappedRecent[lastIdx],
              content: "[RESPOND IN ENGLISH/TANGLISH ONLY — NO SINHALA UNICODE, NO TAMIL UNICODE]\n" + mappedRecent[lastIdx].content,
            };
          }
        }

        let currentMessages: GroqMessage[] = [
          { role: "system", content: systemContent },
          ...mappedRecent,
        ];

        let finalText = "";
        const collectedProducts: KiraProduct[] = [];
        let checkoutInfo: CheckoutInfo | undefined;
        let payLink: string | undefined;
        let modelIndex = 0;
        let hallucinationRetries = 0; // circuit breaker — stop-hook fires at most once
        let stagnantRounds = 0;       // consecutive tool-use rounds with no progress
        let streamedText = false;     // true once real streaming emits the first token
        // Track which tools ran this request so stagnation doesn't misfire
        // during checkout flows (list_delivery_cities + check_delivery + create_order
        // are all meaningful progress even though they collect no products).
        const toolsCalledThisRequest = new Set<string>();
        // Query chain tracking — chainId spans the full request, depth = round index.
        // Logged server-side; emitted as a no-op "chain" SSE the client ignores.
        const chainId = Math.random().toString(36).slice(2, 10);

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
          // Parse args and emit all step labels upfront so the UI shows what's
          // happening before any awaits block. This also lets the user see when
          // multiple tools are running in parallel.
          const parsedCalls = calls.map((toolCall) => {
            const toolName = toolCall.function.name;
            let toolArgs: Record<string, unknown> = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch { /* malformed args */ }

            let stepLabel = TOOL_STEPS[toolName] ?? "Using a tool";
            if (toolName === "kapruka_search_products") {
              const q = String(toolArgs.q ?? "").trim();
              if (q) stepLabel = `Searching Kapruka for "${q}"`;
            }
            controller.enqueue(sse("step", stepLabel));

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

            return { toolCall, toolName, toolArgs };
          });

          // Single-tool executor — shared by both the safe (parallel) and
          // exclusive (sequential) paths below.
          type ParsedCall = { toolCall: Groq.Chat.Completions.ChatCompletionMessageToolCall; toolName: string; toolArgs: Record<string, unknown> };
          async function executeSingleTool({ toolCall, toolName, toolArgs: rawArgs }: ParsedCall) {
            let toolArgs = { ...rawArgs };

            if (JSON_FORMAT_TOOLS.includes(toolName)) {
              toolArgs = { ...toolArgs, response_format: "json" };
            }

            // Correct common misspellings in search queries before hitting MCP.
            if (toolName === "kapruka_search_products" && toolArgs.q) {
              const corrected = String(toolArgs.q)
                .toLowerCase()
                .split(/\s+/)
                .map((w) => SEARCH_SPELLING_MAP[w] ?? w)
                .join(" ");
              toolArgs = { ...toolArgs, q: corrected };
            }

            const toolIndex = mcpTools.findIndex((t) => t.name === toolName);
            const flatSchema =
              toolIndex >= 0
                ? (tools[toolIndex]?.function?.parameters as Record<string, unknown>)
                : null;
            if (flatSchema) toolArgs = coerceArgTypes(toolArgs, flatSchema);

            const needsWrap = toolIndex >= 0 && toolMeta[toolIndex]?.needsParamsWrap;
            const mcpArgs = needsWrap ? { params: toolArgs } : toolArgs;

            toolsCalledThisRequest.add(toolName);
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
              // Connection errors invalidate the singleton so the next request reconnects.
              if (/connection|transport|closed|econnreset|socket/i.test(msg)) {
                invalidateMcpClient();
              }
              resultContent = [{ type: "text", text: `Tool error: ${msg}` }];
            }

            // Emit SSE side-effects as each tool completes.
            const resultText = formatMcpContentForModel(resultContent);

            if (toolName === "kapruka_check_delivery") {
              const deliveryInfo = extractDeliveryInfoFromMcp(resultContent);
              if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
            }
            if (toolName === "kapruka_search_products" || toolName === "kapruka_list_categories") {
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

            return { toolCall, toolName, resultText };
          }

          // Concurrency-classified execution:
          // - Safe (read-only) tools run in parallel via Promise.all
          // - Exclusive tools (create_order) run sequentially after, never overlapping
          // Results are merged back into original call order for currentMessages.
          const safeCalls = parsedCalls.filter((c) => CONCURRENT_SAFE_TOOLS.has(c.toolName));
          const exclusiveCalls = parsedCalls.filter((c) => !CONCURRENT_SAFE_TOOLS.has(c.toolName));

          // Fire summary generation concurrently with tool execution — 8B model
          // resolves in ~0.5s, well within the tool call latency window.
          const summaryPromise = generateToolSummary(parsedCalls.map((c) => c.toolName));

          const safeResults = await Promise.all(safeCalls.map(executeSingleTool));
          const exclusiveResults: typeof safeResults = [];
          for (const call of exclusiveCalls) {
            exclusiveResults.push(await executeSingleTool(call));
          }

          // Merge in original call order (required by Groq's tool_result ordering).
          const byId = new Map(
            [...safeResults, ...exclusiveResults].map((r) => [r.toolCall.id, r]),
          );
          const results = parsedCalls.map((c) => byId.get(c.toolCall.id)!);

          // Emit the summary — should already be resolved since tool calls take longer.
          const summary = await summaryPromise;
          if (summary) controller.enqueue(sse("stepSummary", summary));

          // Push tool results to currentMessages in original call order.
          // truncateForModel strips non-essential fields so the model receives
          // a lean payload while SSE side-effects (above) used the full content.
          for (const { toolCall, toolName, resultText } of results) {
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: truncateForModel(toolName, resultText),
            });
          }
        }

        // Agentic loop — uses Groq streaming so text tokens reach the client in real-time.
        // Tool-call deltas are buffered and reconstructed into the same ChatCompletion
        // shape so all post-loop logic (failed_generation recovery, hallucination hook,
        // context trim, etc.) works unchanged.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let response: Groq.Chat.Completions.ChatCompletion | undefined;

          // ── Model call with clean fallback ──────────────────────────────────
          // Inner loop retries with the next model on 429/413 WITHOUT consuming
          // a round slot — replaces the old `round--` hack. Labels let us break
          // or continue both loops independently.
          let rateExhausted = false;
          let failedGenHandled = false;

          callLoop: while (true) {
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

            try {
              // ── Streaming call ─────────────────────────────────────────────
              // Text tokens are emitted to SSE as they arrive.
              // Tool-call deltas are buffered then reconstructed into the same
              // ChatCompletion shape so all downstream logic stays unchanged.
              let sContent = "";
              const sToolMap = new Map<number, { id: string; name: string; args: string }>();
              let sFinish = "";
              let sUsage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
              // Lookahead buffer — hold the first HAL_LOOKAHEAD chars before committing
              // tokens to SSE so the post-stream hallucination check can still fire.
              const pendingBuf: string[] = [];
              const HAL_LOOKAHEAD = 150;

              const groqStream = await getGroq().chat.completions.create({
                model: MODELS[modelIndex],
                messages: reqMessages,
                tools: reqTools,
                tool_choice: reqTools ? ("auto" as const) : undefined,
                max_tokens: 1024,
                stream: true,
              });

              for await (const chunk of groqStream) {
                const chunkAny = chunk as { usage?: typeof sUsage };
                if (chunkAny.usage) sUsage = chunkAny.usage;
                const sChoice = chunk.choices[0];
                if (!sChoice) continue;
                if (sChoice.finish_reason) sFinish = sChoice.finish_reason;
                const delta = sChoice.delta as {
                  content?: string | null;
                  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
                };
                if (delta.content) {
                  sContent += delta.content;
                  if (!streamedText) {
                    pendingBuf.push(delta.content);
                    // One-time lookahead check once we have enough chars.
                    if (sContent.length >= HAL_LOOKAHEAD) {
                      const earlyHal =
                        /LKR\s*[\d,]+/.test(sContent) &&
                        collectedProducts.length === 0 &&
                        checkoutInfo === undefined &&
                        hallucinationRetries < 1;
                      if (!earlyHal) {
                        for (const t of pendingBuf) controller.enqueue(sse("token", t));
                        pendingBuf.length = 0;
                        streamedText = true;
                      }
                      // else: keep buffering silently — post-loop hook fires the retry.
                    }
                  } else {
                    controller.enqueue(sse("token", delta.content));
                  }
                }
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!sToolMap.has(tc.index)) sToolMap.set(tc.index, { id: "", name: "", args: "" });
                    const entry = sToolMap.get(tc.index)!;
                    if (tc.id) entry.id = tc.id;
                    if (tc.function?.name) entry.name += tc.function.name;
                    if (tc.function?.arguments) entry.args += tc.function.arguments;
                  }
                }
              }

              // Flush lookahead buffer if the completed response looks clean.
              // If it still matches the hallucination pattern, leave the buffer
              // unset so streamedText stays false and the post-loop hook can retry.
              if (pendingBuf.length > 0) {
                const postHal =
                  /LKR\s*[\d,]+/.test(sContent) &&
                  collectedProducts.length === 0 &&
                  checkoutInfo === undefined &&
                  hallucinationRetries < 1;
                if (!postHal) {
                  for (const t of pendingBuf) controller.enqueue(sse("token", t));
                  pendingBuf.length = 0;
                  streamedText = true;
                }
              }

              const sToolCalls = sToolMap.size > 0
                ? Array.from(sToolMap.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([, tc]) => ({
                      id: tc.id,
                      type: "function" as const,
                      function: { name: tc.name, arguments: tc.args },
                    }))
                : undefined;

              // Reconstruct ChatCompletion shape so post-loop code works unchanged.
              response = {
                choices: [{
                  finish_reason: (sFinish || "stop") as "stop" | "length" | "tool_calls" | "content_filter",
                  message: { role: "assistant", content: sContent || null, tool_calls: sToolCalls },
                  index: 0,
                  logprobs: null,
                }],
                usage: sUsage as Groq.Chat.Completions.ChatCompletion["usage"],
                id: "",
                model: MODELS[modelIndex],
                object: "chat.completion",
                created: 0,
              } as Groq.Chat.Completions.ChatCompletion;

              break callLoop; // success — exit inner loop
            } catch (err) {
              type ErrBody = { code?: string; failed_generation?: string; message?: string };
              const apiErr = err as {
                status?: number;
                error?: ErrBody & { error?: ErrBody };
              };
              const inner: ErrBody = apiErr?.error?.error ?? apiErr?.error ?? {};

              // Groq returns 400 with code "context_length_exceeded" or similar for overlong prompts.
              if (
                apiErr?.status === 400 &&
                (inner.code === "context_length_exceeded" ||
                  inner.message?.toLowerCase().includes("prompt_too_long") ||
                  inner.message?.toLowerCase().includes("context length"))
              ) {
                if (currentMessages.length > 5) {
                  currentMessages = [currentMessages[0], ...currentMessages.slice(-4)];
                  continue callLoop;
                }
              }

              if (apiErr?.status === 413) {
                // Context too long — compact to system + last 4 messages and retry once.
                if (currentMessages.length > 5) {
                  currentMessages = [currentMessages[0], ...currentMessages.slice(-4)];
                  continue callLoop;
                }
              }

              if (apiErr?.status === 429 || apiErr?.status === 413) {
                if (modelIndex < MODELS.length - 1) {
                  modelIndex++;
                  continue callLoop; // retry same round with next model
                }
                finalText = L("rateExhausted", language);
                rateExhausted = true;
                break callLoop;
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
                  failedGenHandled = true;
                  break callLoop;
                }
              }

              throw err;
            }
          } // end callLoop

          if (rateExhausted) break;       // all models exhausted — exit round loop
          if (failedGenHandled) continue; // tool calls recovered — next round

          // Query chain tracking — round depth logged for observability.
          console.log(
            `[Kira ${chainId}] round=${round} model=${MODELS[modelIndex]} ` +
            `prompt=${response!.usage?.prompt_tokens ?? "?"} ` +
            `completion=${response!.usage?.completion_tokens ?? "?"}`,
          );
          controller.enqueue(sse("chain", { id: chainId, depth: round }));

          const choice = response!.choices[0];
          const msg = choice.message;

          // ── Max-output-tokens recovery ────────────────────────────────────
          // finish_reason === "length" means Groq cut the response at max_tokens.
          // Inject a resume nudge and continue if round budget allows.
          if (
            choice.finish_reason === "length" &&
            !msg.tool_calls?.length &&
            round < MAX_TOOL_ROUNDS - 1
          ) {
            const partial = (msg.content ?? "").trim();
            if (partial) {
              currentMessages.push({ role: "assistant", content: partial });
              currentMessages.push({
                role: "user",
                content:
                  "Output was cut short by the token limit. Resume directly " +
                  "from where you stopped — no apology, no recap. Pick up " +
                  "mid-sentence if needed.",
              });
            }
            continue;
          }

          if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
            const raw = msg.content ?? "";
            finalText = raw
              .replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "")
              .trim();

            // ── Hallucination stop-hook ───────────────────────────────────────
            // Only fires when no tokens have been streamed yet — once tokens are
            // on the wire we can't retract them, so skip correction in that case.
            if (
              !streamedText &&
              finalText &&
              /LKR\s*[\d,]+/.test(finalText) &&
              collectedProducts.length === 0 &&
              checkoutInfo === undefined &&
              round < MAX_TOOL_ROUNDS - 1 &&
              hallucinationRetries < 1
            ) {
              hallucinationRetries++;
              streamedText = false; // reset so next round can stream afresh
              currentMessages.push({ role: "assistant", content: finalText });
              currentMessages.push({
                role: "user",
                content:
                  "You mentioned LKR prices but haven't called " +
                  "kapruka_search_products or kapruka_check_delivery yet this " +
                  "turn. Do not quote any prices you haven't fetched from " +
                  "Kapruka. Search now, then respond.",
              });
              finalText = "";
              continue; // retry with correction injected
            }

            break;
          }

          currentMessages.push({
            role: "assistant",
            content: msg.content,
            tool_calls: msg.tool_calls,
          });

          await executeToolCalls(msg.tool_calls);

          // ── Context window trim ───────────────────────────────────────────
          // After each tool round, check actual token usage from Groq's response
          // and drop oldest messages if we're approaching the model's context limit.
          const usedTokens = response!.usage?.prompt_tokens;
          if (usedTokens) {
            currentMessages = trimContextIfNeeded(
              currentMessages,
              usedTokens,
              MODELS[modelIndex],
            );
          }

          // ── Diminishing returns / stuck detection ─────────────────────────
          // If we've burned 3+ rounds and still have no products and no text,
          // the loop is spinning. Surface a graceful fallback and exit.
          // Exception: checkout tool chains (list_delivery_cities → check_delivery
          // → create_order) make real progress without collecting products — never
          // fire stagnation while those are in flight.
          const isCheckoutToolChain =
            toolsCalledThisRequest.has("kapruka_list_delivery_cities") ||
            toolsCalledThisRequest.has("kapruka_check_delivery") ||
            toolsCalledThisRequest.has("kapruka_create_order");
          if (round >= 2 && collectedProducts.length === 0 && !finalText && !isCheckoutToolChain) {
            console.log(`[Kira ${chainId}] stuck after ${round + 1} rounds — bailing`);
            stagnantRounds++;
            if (stagnantRounds >= 2) {
              finalText = L("stagnantFallback", language);
              break;
            }
          } else {
            stagnantRounds = 0;
          }
        }

        if (!finalText) {
          finalText = L("timeoutFallback", language);
        }

        // Hard intercept: 8b model has no tool access and will hallucinate product listings.
        // If we ended on the last-resort model with no real products and the user was clearly
        // shopping, surface a clean "can't connect" message instead of invented descriptions.
        const SHOPPING_INTENT_RE =
          /\b(show|search|find|book|cake|flower|gift|chocolat|fashion|toy|hamper|stationar|stationer|electronic|phone|looking for|want to (buy|get|order)|recommend)\b/i;
        if (
          modelIndex === MODELS.length - 1 &&
          collectedProducts.length === 0 &&
          checkoutInfo === undefined &&
          SHOPPING_INTENT_RE.test(latestUserText)
        ) {
          finalText = L("troubleConnecting", language);
        }

        // Language enforcement guard — catches LLM ignoring the language instruction.
        // Uses \u escapes (not literal chars) to avoid any source-file encoding issues.
        // Runs after the hard intercept so both safety layers apply.
        {
          const SINHALA_RE = /[඀-෿]/;
          const TAMIL_RE   = /[஀-௿]/;
          const hasSinhala = SINHALA_RE.test(finalText);
          const hasTamil   = TAMIL_RE.test(finalText);
          if (language === "en" && (hasSinhala || hasTamil)) {
            // Kapruka product names are often in Sinhala/Tamil script, so a small number
            // of foreign-script chars in an EN reply is expected and correct. Only replace
            // if foreign script makes up > 20% of the response — a clear language violation.
            const sChars = (finalText.match(/[඀-෿]/g) ?? []).length;
            const tChars = (finalText.match(/[஀-௿]/g) ?? []).length;
            if ((sChars + tChars) / Math.max(finalText.length, 1) > 0.20) {
              finalText = L("troubleConnecting", "en");
            }
          } else if (language === "si" && !hasSinhala) {
            finalText = L("troubleConnecting", "si");
          } else if (language === "ta" && !hasTamil) {
            finalText = L("troubleConnecting", "ta");
          }
        }

        // Tokens were already emitted in real-time during the streaming call above.
        // Only fall back to bulk-emit here if streaming was bypassed (e.g. the
        // failed_generation recovery path reconstructs fake tool calls and the
        // subsequent round streams normally — so this only fires in edge cases).
        if (!streamedText && finalText) {
          const words = finalText.match(/\S+\s*/g) ?? [];
          for (const word of words) {
            controller.enqueue(sse("token", word));
          }
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
        // Shared singleton — do not close. Invalidate only on connection errors,
        // which callMcpTool handles automatically.
        void mcpClient;
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

// Matches "show me those/them as pictures/cards/photos/images/listings" and similar referential re-show requests.
// These refer to previously mentioned specific products, not a new search.
const RESHOW_AS_CARDS_RE =
  /\b(show|see|view|display)\b.{0,40}\b(those|them|it|the[ms]e)\b.{0,40}\b(picture|photo|image|card|visual|pic|listing|listings)\b/i;
// Also catches "can u show them to me", "can u show me those two items as pictures" etc.
const RESHOW_THOSE_RE =
  /\b(show\s+me|show\s+us|can\s+(?:you|u)\s+show(?:\s+(?:me|them|those|it))?\b|let\s+me\s+see)\b.{0,30}\b(those|them|the[ms]e|the\s+(?:two|three|four|\d))\b/i;

async function tryHandleDeterministicPrompt({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  lastProducts,
  language,
  mcpClient,
  controller,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  lastProducts?: KiraProduct[];
  language: string;
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>;
  controller: ReadableStreamDefaultController<Uint8Array>;
}): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // ── Empty / whitespace input ─────────────────────────────────────────────
  // Return a friendly prompt rather than a terse one-liner.
  if (!trimmed) {
    await streamWords(controller, "Hey! I'm Kira — your Kapruka shopping helper 🎁 Tell me what you're looking for: a gift, cakes, flowers, or something else?");
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Jailbreak / persona-change intercept ─────────────────────────────────
  // "pretend you're a different AI", "act as X", "ignore your instructions" etc.
  // Catch before any search logic so the LLM never gets a chance to comply.
  const JAILBREAK_RE = /\b(pretend\s+(you(?:'?re?|\s+are?)|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+(your\s+)?(previous\s+)?instructions?|forget\s+your\s+(system\s+)?prompt|disregard\s+your|roleplay\s+as|be\s+a\s+different\s+ai|simulate\s+(being\s+)?an?\s+ai)\b/i;
  if (JAILBREAK_RE.test(lower)) {
    await streamWords(controller, "Ha, I'm just Kira — one personality is plenty for me! Anything I can find for you on Kapruka? 🛍️");
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Platform trust questions intercept ───────────────────────────────────
  // "is Kapruka legit?", "can I trust this?", "is this safe?" etc.
  // Answer warmly without calling any tools.
  // Allows optional article/adjective between subject and quality word:
  // "is Kapruka legit?" ✓  "is Kapruka a legit site?" ✓  "is this a safe site?" ✓
  const TRUST_RE = /\b(is\s+(kapruka|this|it)(\s+\w+){0,3}\s+(legit|safe|real|trusted?|reliable|genuine|authentic|scam)|can\s+i\s+trust\s+(kapruka|this|it)|kapruka\s+(legit|safe|real|trusted?|reliable))\b/i;
  if (TRUST_RE.test(lower)) {
    await streamWords(controller, "Absolutely — Kapruka has been Sri Lanka's biggest online gifting platform since 2010. Totally legit, secure payments, real delivery. Want to browse what's in stock? 🎁");
    controller.enqueue(sse("done"));
    return true;
  }

  // Check if the previous assistant turn was asking for an order number — if so, treat
  // this message as the order number reply even without "track" in it.
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const kiraJustAskedForOrderNumber = lastAssistantMsg.includes("order number") || lastAssistantMsg.includes("order_number") || lastAssistantMsg.includes("confirmation email");
  const looksLikeOrderNumber = /^[A-Z0-9]{5,20}$/i.test(trimmed.replace(/\s+/g, ""));

  const wantsTracking =
    (lower.includes("track") && (lower.includes("order") || lower.includes("delivery"))) ||
    (kiraJustAskedForOrderNumber && looksLikeOrderNumber);
  if (wantsTracking) {
    const orderNumber = extractOrderNumber(trimmed);
    if (!orderNumber) {
      await streamWords(controller, L("trackingAskOrderNumber", language));
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
          Lf("trackingFound", language, {
            orderNumber: tracking.orderNumber || orderNumber,
            status: tracking.statusDisplay || tracking.currentStatus || "",
          })
        );
        controller.enqueue(sse("tracking", tracking));
      } else {
        const parsed = parseMcpPayload(trackingResult.content);
        const reason = parsed.ok ? "I couldn’t read the tracking details." : parsed.error;
        await streamWords(
          controller,
          Lf("trackingNotFound", language, { orderNumber, reason })
        );
      }
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "Show me those as pictures / can u show me those two items as cards / show them as listings" —
  // re-emit the last known products without a new MCP search.
  if (RESHOW_AS_CARDS_RE.test(trimmed) || RESHOW_THOSE_RE.test(trimmed)) {
    if (lastProducts && lastProducts.length > 0) {
      const reshowKey = lastProducts.length === 1 ? "reshowHereItemsSingle" : "reshowHereItems";
      await streamWords(
        controller,
        lastProducts.length === 1
          ? L(reshowKey, language)
          : Lf(reshowKey, language, { n: lastProducts.length })
      );
      controller.enqueue(sse("products", lastProducts));
      controller.enqueue(sse("done"));
      return true;
    }
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
        Lf("reshowNothingFoundQuery", language, { query: ctx.query })
      );
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        Lf("reshowRealListings", language, { budget: budgetText, n: reshowProducts.length })
      );
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  if (lower.includes("ready to checkout") || lower.includes("complete the order")) {
    const message = cart.length === 0
      ? L("checkoutEmptyCart", language)
      : L("checkoutNeedName", language);
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
      await streamWords(controller, L("reshowNothingInStock", language));
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      const reshowKey = reshowProducts.length === 1 ? "reshowHereYouGoOne" : "reshowHereYouGo";
      await streamWords(
        controller,
        Lf(reshowKey, language, { budget: budgetText, n: reshowProducts.length })
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
      await streamWords(controller, L("moreOptionsSamePicks", language));
    } else if (moreProducts.length <= 3) {
      await streamWords(
        controller,
        Lf("moreOptionsAboutAll", language, { query: ctx.query })
      );
      controller.enqueue(sse("products", moreProducts));
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        Lf("moreOptionsHere", language, { budget: budgetText })
      );
      controller.enqueue(sse("products", moreProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // Gift intent fast-path — catches broad gift/occasion queries that stall the LLM loop.
  // Matches: "something for Father's Day under 3000", "amma ta gift ekak ganna ona",
  // "I need a gift for Colombo", etc.
  const GIFT_INTENT_RE =
    /\b(gift|present|something\s+(for|nice)|what\s+(to\s+)?(buy|get|send)|father'?s\s+day|mother'?s\s+day|birthday\s+gift)\b/i;
  const SL_FAMILY_GIFT_RE =
    /\b(amma|thaththa|thaththaa|acca|akka|aiya|malli|nangi|nona)\s+(ta|ge|for)\b/i;

  const hasBudgetHint = /\b(?:under|below|max|maximum|budget|lkr\s*\d)\b/i.test(lower);
  const hasOccasionHint = /\b(father'?s\s+day|mother'?s\s+day|birthday|avurudu|vesak|wedding|anniversary)\b/i.test(lower);
  const hasCityHint = !!extractCityHint(trimmed);
  const hasFamilyHint = SL_FAMILY_GIFT_RE.test(lower);
  // Only fire the gift fast-path when there's at least one concrete signal beyond the word "gift".
  // - "just a gift" / "amma ta" alone → fall through to LLM so it asks what kind of gift.
  // - "gift for dad under 3000" / "flowers for amma to Kandy" → fast-path is useful.
  // hasFamilyHint is intentionally NOT in the right-hand guard — a family term alone (no
  // budget/occasion/city) doesn't give us enough to search usefully.
  if ((GIFT_INTENT_RE.test(lower) || hasFamilyHint) && (hasBudgetHint || hasOccasionHint || hasCityHint)) {
    const priceMatch = lower.match(/\b(?:under|below|max|maximum)\s+(?:lkr\s*)?([\d,]+)/);
    const giftMaxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
    const giftCityHint = extractCityHint(trimmed) ?? deliveryCity;

    controller.enqueue(sse("step", `Searching Kapruka for "gift"`));
    const giftResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: "gift",
        limit: 6,
        in_stock_only: true,
        ...(giftMaxPrice ? { max_price: giftMaxPrice } : {}),
        response_format: "json",
      },
    });
    const giftProducts = dedupeProducts(extractProductsFromMcp(giftResult.content));

    if (giftCityHint && giftProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
      const giftCityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
        params: { query: giftCityHint, limit: 3, response_format: "json" },
      });
      const canonicalGiftCity = extractFirstCity(giftCityResult.content) ?? giftCityHint;
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const giftDeliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: canonicalGiftCity,
          product_id: giftProducts[0].id,
          response_format: "json",
        },
      });
      const giftDelivery = extractDeliveryInfoFromMcp(giftDeliveryResult.content);
      if (giftDelivery) controller.enqueue(sse("delivery", giftDelivery));
    }

    // If q:"gift" returned nothing, try common gift categories before giving up.
    if (giftProducts.length === 0) {
      for (const fallbackQ of ["chocolate", "flowers", "hamper", "cake"]) {
        const fb = await callMcpTool(mcpClient, "kapruka_search_products", {
          params: {
            q: fallbackQ,
            limit: 6,
            in_stock_only: true,
            ...(giftMaxPrice ? { max_price: giftMaxPrice } : {}),
            response_format: "json",
          },
        });
        const fbProducts = dedupeProducts(extractProductsFromMcp(fb.content));
        if (fbProducts.length > 0) {
          giftProducts.push(...fbProducts);
          break;
        }
      }
    }

    if (giftProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: "gift" }));
    } else {
      const budgetText = giftMaxPrice ? ` under LKR ${giftMaxPrice.toLocaleString("en-LK")}` : "";
      const cityText = giftCityHint ? ` to ${giftCityHint}` : "";
      const giftKey = giftProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
      await streamWords(
        controller,
        Lf(giftKey, language, { n: giftProducts.length, budget: budgetText, city: cityText, date: "" })
      );
      controller.enqueue(sse("products", giftProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "What's popular?" / "what's trending?" / "what's good?" → bestseller browse, no category needed.
  const POPULAR_RE = /\b(what'?s?\s+)?(popular|trending|bestsell|best\s+sell|what'?s?\s+good|most\s+bought|top\s+pick|top\s+gift)\b/i;
  if (POPULAR_RE.test(lower)) {
    controller.enqueue(sse("step", `Browsing Kapruka bestsellers`));
    let popularProducts: KiraProduct[] = [];
    for (const q of ["hamper", "chocolate", "flowers", "cake"]) {
      const r = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: { q, limit: 6, in_stock_only: true, sort: "bestseller", response_format: "json" },
      });
      popularProducts = dedupeProducts(extractProductsFromMcp(r.content));
      if (popularProducts.length > 0) break;
    }
    if (popularProducts.length === 0) {
      await streamWords(controller, "Nothing jumping out as a bestseller right now — want me to search a specific category?");
    } else {
      await streamWords(controller, `Here are Kapruka's top picks right now — all in stock. 🛍️`);
      controller.enqueue(sse("products", popularProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // Bare "product under budget" fast-path — catches queries like "birthday cake under 2000",
  // "chocolates under 3000", "flowers under 1500" that lack a "show me" prefix and therefore
  // fall through parseSearchIntent. Prevents the LLM from asking for city before searching.
  const BARE_PRODUCT_BUDGET_RE =
    /\b(cake|birthday\s+cake|chocolate|flowers?|bouquet|roses?|hamper|gift\s+hamper|perfume|saree|toys?|electronics?|teddy|candles?|cookie|biscuit)\b.{0,40}\b(under|below|max|budget)\s*(?:lkr\s*)?([\d,]+)/i;
  const bareMatch = BARE_PRODUCT_BUDGET_RE.exec(lower);
  if (bareMatch) {
    const bareQuery = bareMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
    const bareMaxPrice = Number(bareMatch[3].replace(/,/g, ""));
    if (bareMaxPrice >= 100 && bareMaxPrice <= 500_000) {
      controller.enqueue(sse("step", `Searching Kapruka for "${bareQuery}"`));
      let bareProducts: KiraProduct[] = [];
      for (const q of [bareQuery, fallbackQuery(bareQuery)]) {
        if (!q) continue;
        const r = await callMcpTool(mcpClient, "kapruka_search_products", {
          params: { q, limit: 6, in_stock_only: true, max_price: bareMaxPrice, response_format: "json" },
        });
        bareProducts = dedupeProducts(extractProductsFromMcp(r.content));
        if (bareProducts.length > 0) break;
      }
      const cityHint = extractCityHint(trimmed) ?? deliveryCity;
      if (bareProducts.length === 0) {
        await streamWords(controller, Lf("searchNothingFound", language, { query: bareQuery }));
      } else {
        const budgetText = ` under LKR ${bareMaxPrice.toLocaleString("en-LK")}`;
        const cityText = cityHint ? ` to ${cityHint}` : "";
        const key = bareProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
        await streamWords(controller, Lf(key, language, { n: bareProducts.length, budget: budgetText, city: cityText, date: "" }));
        controller.enqueue(sse("products", bareProducts));
        if (cityHint && bareProducts[0]) {
          const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
            params: { city: cityHint, product_id: bareProducts[0].id, response_format: "json" },
          });
          const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
          if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
        }
      }
      controller.enqueue(sse("done"));
      return true;
    }
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
      Lf("searchNothingFound", language, { query: searchIntent.query })
    );
  } else {
    const budgetText = searchIntent.maxPrice
      ? ` under LKR ${searchIntent.maxPrice.toLocaleString("en-LK")}`
      : "";
    const cityText = deliveryCityForMessage ? ` to ${deliveryCityForMessage}` : "";
    const dateText = effectiveDate ? ` on ${effectiveDate}` : "";
    const introKey = products.length === 1 ? "searchFoundOne" : "searchFoundMany";
    const intro = Lf(introKey, language, {
      n: products.length,
      budget: budgetText,
      city: cityText,
      date: dateText,
    });
    await streamWords(controller, intro);
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
    if (/\bsari|saree|sarree|sare\b/.test(msgLow)) { query = "saree"; break; }
    if (/\bjewel|necklace|bracelet|ring\b/.test(msgLow)) { query = "jewellery"; break; }
    if (/\bperfume|fragrance\b/.test(msgLow)) { query = "perfume"; break; }
    if (/\bfashion|clothing|wear|dress|shirt\b/.test(msgLow)) { query = "fashion"; break; }
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

  // Referential messages ("show me those", "can u show me them as pictures") are
  // handled by the re-show fast-path — don't treat them as new searches.
  const isReferential =
    /\b(those|them|the[ms]e|the\s+(?:two|three|four|\d+)\s+items?)\b/i.test(lower) &&
    !/\b(cake|flower|chocolate|hamper|gift|fashion|electronic|phone|toy|rose|bouquet)\b/i.test(lower);
  if (isReferential) return null;

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
  // Match Kapruka order IDs: 5–20 chars. Prefer an alphanumeric token containing
  // BOTH letters and digits (e.g. KAP12345, 102jidas). Fall back to a purely
  // numeric token (e.g. 10234567) so numeric-only order numbers are still tracked.
  // Never fall back to an all-letters token — that would treat plain words
  // ("track", "order") as order numbers.
  const m = text.match(/\b([A-Z0-9]{5,20})\b/gi);
  if (!m) return undefined;
  const candidate =
    m.find((s) => /[A-Z]/i.test(s) && /\d/.test(s)) ??
    m.find((s) => /^\d{5,20}$/.test(s));
  return candidate?.toUpperCase();
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

// ─── Tool concurrency classification ─────────────────────────────────────────
// Read-only MCP tools are safe to run concurrently. kapruka_create_order has
// side-effects (places a real order) and must run alone after safe tools finish.
const CONCURRENT_SAFE_TOOLS = new Set([
  "kapruka_search_products",
  "kapruka_list_categories",
  "kapruka_check_delivery",
  "kapruka_get_product",
  "kapruka_list_delivery_cities",
  "kapruka_track_order",
]);

// ─── Tool use summary (8B model) ──────────────────────────────────────────────
// Fired async after each tool batch. Uses the cheap 8B model so it resolves in
// ~0.5s — well within the next model call's latency — making it essentially free.
// Human-readable labels for the ThinkingDone summary shown to users.
const TOOL_SUMMARY_LABELS: Record<string, string> = {
  kapruka_search_products: "Searched Kapruka catalog",
  kapruka_list_categories: "Listed Kapruka categories",
  kapruka_check_delivery: "Checked delivery availability",
  kapruka_get_product: "Retrieved product details",
  kapruka_create_order: "Placed your order",
  kapruka_list_delivery_cities: "Resolved delivery city",
  kapruka_track_order: "Fetched order status",
};

async function generateToolSummary(toolNames: string[]): Promise<string> {
  // Build summary from deterministic labels first — avoids the 8B model call
  // leaking internal reasoning into the ThinkingBlock shown to users.
  const known = toolNames
    .map((n) => TOOL_SUMMARY_LABELS[n])
    .filter(Boolean);
  if (known.length > 0) return known.join(" · ");

  // Fallback: ask 8B model, but sanitise the output before returning.
  try {
    const label = toolNames.map((n) => n.replace("kapruka_", "")).join(", ");
    const res = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content:
            `Summarize these API calls in ≤8 words, past tense, no articles: ${label}. ` +
            `Example: "Searched chocolates, checked Colombo delivery". Output the summary only — no internal reasoning, no "I need", no "I will".`,
        },
      ],
      max_tokens: 32,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    // Strip any lines that look like internal monologue (start with "I ")
    const clean = raw.split(/[.\n]/).filter(l => !/^I\s/i.test(l.trim())).join(". ").trim();
    return clean;
  } catch {
    return ""; // non-critical — swallow errors silently
  }
}

// ─── Context window arithmetic ───────────────────────────────────────────────
// Groq model context limits. We reserve OUTPUT_TOKEN_RESERVE tokens so the
// model always has headroom to finish its response.
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "llama-3.3-70b-versatile": 128_000,
  "meta-llama/llama-4-scout-17b-16e-instruct": 131_000,
  "llama-3.1-8b-instant": 128_000,
};
const OUTPUT_TOKEN_RESERVE = 1_500;
const TRIM_TRIGGER_PCT = 0.75; // start trimming at 75% usage
const TRIM_TARGET_PCT  = 0.60; // trim back to 60%

// Dynamically trims the oldest non-system messages from currentMessages when
// the previous round's prompt_tokens shows we're approaching the context limit.
// Operates on message count with an avg-token estimate — good enough for Kira's
// short messages; no per-message tokenizer needed.
function trimContextIfNeeded(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  promptTokens: number,
  model: string,
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const effective = (MODEL_CONTEXT_LIMITS[model] ?? 128_000) - OUTPUT_TOKEN_RESERVE;
  if (promptTokens < effective * TRIM_TRIGGER_PCT) return messages;

  const system = messages[0];
  const rest = messages.slice(1);
  if (rest.length <= 2) return messages; // nothing safe to drop

  const avgTokensPerMessage = promptTokens / messages.length;
  const targetTokens = effective * TRIM_TARGET_PCT;
  const toDrop = Math.min(
    Math.ceil((promptTokens - targetTokens) / avgTokensPerMessage),
    rest.length - 2, // always keep ≥ 2 recent messages
  );

  if (toDrop <= 0) return messages;
  console.log(
    `[Kira] context trim: ${promptTokens}/${effective} tokens — dropping ${toDrop} messages`,
  );
  return [system, ...rest.slice(toDrop)];
}

// ─── Context compaction ──────────────────────────────────────────────────────
// Scans messages that fell outside the active window and extracts structured
// facts (budget, city, occasion, recipient, whether products were shown) so
// Kira retains cross-turn memory without bloating the active context window.
function buildCompactSummary(
  messages: { role: string; content: string }[]
): string {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (f: string) => {
    if (!seen.has(f)) { seen.add(f); facts.push(`• ${f}`); }
  };

  for (const msg of messages) {
    const t = typeof msg.content === "string" ? msg.content : "";
    const lo = t.toLowerCase();

    if (msg.role === "user") {
      const budget = t.match(
        /\b(?:under|below|max(?:imum)?|budget)[:\s]+(?:lkr\s*)?([\d,]+)/i
      );
      if (budget) push(`Budget ceiling: LKR ${budget[1].replace(/,/g, "")}`);

      const city = t.match(SERVER_CITY_REGEX);
      if (city) push(`Delivery city mentioned: ${city[1]}`);

      const occ = t.match(
        /\b(birthday|wedding|anniversary|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|new\s+year)\b/i
      );
      if (occ) push(`Occasion: ${occ[1]}`);

      const rec = t.match(
        /\bfor\s+(?:my\s+)?(mum|mom|amma|dad|father|mother|wife|husband|friend|sister|brother|daughter|son|boss|colleague)\b/i
      );
      if (rec) push(`Recipient: ${rec[1]}`);
    }

    if (msg.role === "assistant") {
      if (/\d+\s+picks?|showing\s+\d+|here\s+are\s+\d+/i.test(lo))
        push("Products were shown from Kapruka search");
      if (/delivery\s+(?:to\s+\w+\s+)?(?:is\s+)?lkr\s*[\d,]+/i.test(lo))
        push("Delivery fee was confirmed");
      if (/order\s+(?:has\s+been\s+)?placed|checkout\s+link/i.test(lo))
        push("An order was placed or a checkout link was shared");
    }
  }

  if (facts.length === 0) return "";
  return `[Earlier conversation summary]\n${facts.join("\n")}`;
}

// ─── Tool result truncation ───────────────────────────────────────────────────
// Applied AFTER SSE side-effects (which read from the full resultContent) and
// BEFORE currentMessages.push so the model receives a lean payload.
// For product search results this can cut 4–6 KB down to ~600 bytes.
function truncateForModel(toolName: string, resultText: string): string {
  if (
    toolName === "kapruka_search_products" ||
    toolName === "kapruka_list_categories"
  ) {
    try {
      const data = JSON.parse(resultText) as Record<string, unknown>;
      const raw =
        (data.products ?? data.results ?? data.items) as unknown[] | undefined;
      if (Array.isArray(raw)) {
        if (raw.length === 0) {
          return JSON.stringify({
            results: [],
            total: 0,
            message:
              "No products found for this search query. Try a broader term, a corrected spelling, or a related category.",
          });
        }
        type P = Record<string, unknown>;
        const slim = (raw as P[]).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? p.sale_price,
          url: p.url ?? p.product_url,
          in_stock: p.in_stock ?? p.available,
        }));
        return JSON.stringify({ ...data, products: slim });
      }
    } catch { /* fall through to char cap */ }
  }

  const CAP: Record<string, number> = {
    kapruka_get_product: 1200,
    kapruka_check_delivery: 700,
    kapruka_list_delivery_cities: 500,
    kapruka_track_order: 900,
    kapruka_create_order: 900,
  };
  const limit = CAP[toolName] ?? 2000;
  if (resultText.length <= limit) return resultText;
  return (
    resultText.slice(0, limit) +
    `\n…[${resultText.length - limit} chars omitted]`
  );
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
