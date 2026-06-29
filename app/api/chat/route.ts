import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import {
  buildSandboxCheckoutInfo,
  isSandboxCheckout,
} from "@/lib/checkout-sandbox";
import {
  getColomboTodayIso,
  getColomboTomorrowIso,
} from "@/lib/colombo-date";
import { getMcpClient, invalidateMcpClient, isMcpSessionExpiredError, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import {
  extractCheckoutInfoFromMcp,
  extractDeliveryInfoFromMcp,
  extractProductsFromMcp,
  extractTrackingFromMcp,
  formatMcpContentForModel,
} from "@/lib/mcp-parsing";
import {
  isUnsafeCatalogClaim,
  shouldGuardCatalogText,
  stripKnownProductNames,
} from "@/lib/kira/catalog-guard";
import { buildCompactSummary, trimContextIfNeeded } from "@/lib/kira/context";
import { tryHandleDeterministicPrompt } from "@/lib/kira/fast-paths";
import { getGroq } from "@/lib/kira/groq";
import { coerceArgTypes, relaxSchema, resolveSchema } from "@/lib/kira/groq-schema";
import { L, Lf } from "@/lib/kira/localization";
import {
  getCachedMcpTools,
  setCachedMcpTools,
} from "@/lib/kira/mcp-tools-cache";
import {
  canInvokeMcpTool,
  isCheckoutConfirmation,
} from "@/lib/kira/permissions";
import { buildProfilePrompt, detectProfile } from "@/lib/kira/profiles";
import {
  buildSessionContextReminder,
  COMPACT_RESUME_INSTRUCTION,
  validateLastProducts,
  validateShownProducts,
} from "@/lib/kira/session-context";
import {
  CATEGORY_IRRELEVANCE_TERMS,
  CATEGORY_RELEVANCE_TERMS,
  SEARCH_SPELLING_MAP,
} from "@/lib/kira/search";
import { sse, TOOL_STEPS } from "@/lib/kira/sse";
import {
  CONCURRENT_SAFE_TOOLS,
  generateToolSummary,
  truncateForModel,
} from "@/lib/kira/tool-summary";
import type {
  CartItem,
  ChatRequest,
  CheckoutInfo,
  DeliveryQuote,
  KiraProduct,
  LastOrder,
} from "@/types";

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
const SSE_KEEPALIVE_MS = 15_000;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();
  const sandboxCheckout = isSandboxCheckout(req);

  const stream = new ReadableStream({
    async start(controller) {
      let mcpClient: Awaited<ReturnType<typeof getMcpClient>> | undefined;
      // Per-request delivery cache — keyed by city|date|product to avoid
      // cross-contaminating date-specific quotes across calls.
      const deliveryCacheStore = new Map<string, unknown>();

      try {
        const {
          messages,
          cart,
          deliveryCity,
          deliveryDate,
          budget,
          occasion,
          recipient,
          lastProducts,
          shownProducts,
          lastOrder,
        } = body;
        const language: string = body.language ?? "en";
        const latestUserText =
          [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const checkoutConfirmed = isCheckoutConfirmation(latestUserText);
        const safeLastProducts = validateLastProducts(lastProducts);
        const safeShownProducts = validateShownProducts(shownProducts, safeLastProducts);

        const sessionReminder = buildSessionContextReminder({
          cart,
          deliveryCity,
          deliveryDate,
          budget,
          occasion,
          recipient,
          lastProducts: safeLastProducts,
        });

        const internationalContext = body.internationalMode
          ? "\n\nSender is overseas — quote LKR prices and approximate USD (LKR 300 ≈ USD 1). Reassure: Kapruka delivers islandwide; need recipient's Sri Lanka address."
          : "";

        if (!process.env.GROQ_API_KEY) {
          controller.enqueue(sse("error", "Demo mode limited: Set GROQ_API_KEY in .env.local"));
          controller.close();
          return;
        }

        mcpClient = await getMcpClient();
        if (
          await tryHandleDeterministicPrompt({
            text: latestUserText,
            messages,
            cart,
            deliveryCity,
            deliveryDate,
            lastProducts: safeLastProducts,
            shownProducts: safeShownProducts,
            lastOrder,
            language,
            mcpClient,
            controller,
            budget,
            occasion,
            recipient,
            internationalMode: body.internationalMode,
          })
        ) {
          controller.close();
          return;
        }

        let mcpTools: Awaited<ReturnType<typeof listMcpTools>>;
        const cachedTools = getCachedMcpTools();
        if (cachedTools) {
          mcpTools = cachedTools;
        } else {
          mcpTools = await listMcpTools(mcpClient);
          setCachedMcpTools(mcpTools);
        }

        const trimDesc = (desc: string) =>
          desc.split(/\n/)[0].split(". ")[0].slice(0, 120);


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
          olderMessages.length > 0
            ? buildCompactSummary(olderMessages, {
                budget,
                occasion,
                recipient,
                deliveryCity,
                deliveryDate,
                cart,
                lastProducts: safeLastProducts,
              })
            : "";

        const activeProfile = detectProfile(latestUserText, cart.length);
        const profilePrompt = activeProfile ? buildProfilePrompt(activeProfile) : "";

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
            : "\n\nIMPORTANT — LANGUAGE: You MUST respond in English or Tanglish. Tanglish means casual English mixed with ROMANIZED Sinhala/Tamil words only (e.g. 'aiyo', 'machang', 'amma', 'podi', 'nona'). Do not write Sinhala Unicode (U+0D80–U+0DFF) or Tamil Unicode (U+0B80–U+0BFF) in your own prose, even if the user writes in those scripts. Exception: exact Kapruka product names returned by tools may remain in their original Sinhala/Tamil Unicode script. The selected language mode OVERRIDES the input script.";

        // Authoritative per-request date. KIRA_SYSTEM_PROMPT bakes `new Date()` at
        // module-load time, which goes stale after a cold start; this line is
        // evaluated on every request and overrides it for delivery-date logic.
        const todayIso = getColomboTodayIso();
        const tomorrowIso = getColomboTomorrowIso();
        const dateContext =
          `\n\n[CURRENT DATE: ${todayIso} — treat this as today for ALL delivery-date logic. ` +
          `Delivery date must be today or later; if the user gives no date, default to tomorrow (${tomorrowIso}) and confirm.]`;

        const systemContent =
          KIRA_SYSTEM_PROMPT +
          profilePrompt +
          dateContext +
          internationalContext +
          langInstruction +
          (compactSummary ? `\n\n${compactSummary}` : "");

        const mappedRecent = recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        if (sessionReminder) {
          mappedRecent.unshift({
            role: "user" as const,
            content: sessionReminder,
          });
        }

        if (compactSummary) {
          mappedRecent.push({
            role: "user" as const,
            content: COMPACT_RESUME_INSTRUCTION,
          });
        }

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
              content: "[RESPOND IN ENGLISH/TANGLISH PROSE ONLY — EXACT KAPRUKA PRODUCT NAMES MAY KEEP ORIGINAL SCRIPT]\n" + mappedRecent[lastIdx].content,
            };
          }
        }

        let currentMessages: GroqMessage[] = [
          { role: "system", content: systemContent },
          ...mappedRecent,
        ];

        let finalText = "";
        const collectedProducts: KiraProduct[] = [];
        const collectedDeliveryQuotes: DeliveryQuote[] = [];
        let checkoutInfo: CheckoutInfo | undefined;
        // Recipient / delivery / gift-message captured from the create_order call so the
        // lastOrder snapshot can pre-fill a reorder, not just re-show the items.
        let lastOrderArgs:
          | Partial<Pick<LastOrder, "recipient" | "delivery" | "giftMessage">>
          | undefined;
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
          const parsedCalls = calls.map((toolCall, index) => {
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
            const stepId = `step-${index}-${toolName}`;
            controller.enqueue(sse("step", { id: stepId, label: stepLabel }));

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

            return { toolCall, toolName, toolArgs, stepId, stepLabel };
          });

          // Single-tool executor — shared by both the safe (parallel) and
          // exclusive (sequential) paths below.
          type ParsedCall = {
            toolCall: Groq.Chat.Completions.ChatCompletionMessageToolCall;
            toolName: string;
            toolArgs: Record<string, unknown>;
            stepId: string;
            stepLabel: string;
          };
          async function executeSingleTool({ toolCall, toolName, toolArgs: rawArgs, stepId }: ParsedCall) {
            const asRecord = (v: unknown): Record<string, unknown> | undefined =>
              v && typeof v === "object" && !Array.isArray(v)
                ? (v as Record<string, unknown>)
                : undefined;
            let toolArgs = { ...rawArgs };

            // Some models still emit MCP-style `{ params: {...} }` even though we
            // flatten the schema for Groq. Merge the inner params up so create_order
            // never becomes params.params — merging (not replacing) preserves any
            // sibling fields the model left at the top level in a partial wrap.
            if (toolName === "kapruka_create_order") {
              const wrapped = asRecord(toolArgs.params);
              if (wrapped) {
                toolArgs = { ...toolArgs, ...wrapped };
                delete toolArgs.params;
              }
            }

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

            const permission = canInvokeMcpTool(toolName, toolArgs, {
              checkoutConfirmed,
            });
            if (!permission.allowed) {
              const errText = `<tool_use_error>PermissionError: ${permission.reason}</tool_use_error>`;
              controller.enqueue(sse("stepDone", stepId));
              return { toolCall, toolName, resultText: errText };
            }

            toolsCalledThisRequest.add(toolName);
            let resultContent: unknown;
            const keepalive = setInterval(() => {
              controller.enqueue(sse("ping"));
            }, SSE_KEEPALIVE_MS);
            try {
              if (toolName === "kapruka_create_order" && sandboxCheckout) {
                checkoutInfo = buildSandboxCheckoutInfo(cart);
                payLink = checkoutInfo.checkoutUrl;
                const clean = (v: unknown): string | undefined => {
                  const s = typeof v === "string" ? v.trim() : "";
                  return s ? s : undefined;
                };
                const rec = asRecord(toolArgs.recipient);
                const del = asRecord(toolArgs.delivery);
                const recipientName = clean(rec?.name);
                const recipientPhone = clean(rec?.phone);
                const deliveryCityValue = clean(del?.city);
                const deliveryAddress = clean(del?.address);
                const giftMessage = clean(toolArgs.gift_message ?? toolArgs.giftMessage);
                lastOrderArgs = {
                  recipient: recipientName && recipientPhone
                    ? { name: recipientName, phone: recipientPhone }
                    : undefined,
                  delivery: deliveryCityValue && deliveryAddress
                    ? { city: deliveryCityValue, address: deliveryAddress }
                    : undefined,
                  giftMessage,
                };
                resultContent = [
                  {
                    type: "text",
                    text: JSON.stringify({
                      checkout_url: checkoutInfo.checkoutUrl,
                      order_ref: checkoutInfo.orderRef,
                      mode: "sandbox",
                    }),
                  },
                ];
              } else if (toolName === "kapruka_check_delivery") {
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
              if (isConnectionError(mcpErr) || isMcpSessionExpiredError(mcpErr)) {
                invalidateMcpClient();
              }
              resultContent = [
                {
                  type: "text",
                  text: `<tool_use_error>McpToolCallError: ${msg}</tool_use_error>`,
                },
              ];
            } finally {
              clearInterval(keepalive);
            }

            // Emit SSE side-effects as each tool completes.
            const resultText = formatMcpContentForModel(resultContent);

            if (toolName === "kapruka_check_delivery") {
              const deliveryInfo = extractDeliveryInfoFromMcp(resultContent);
              if (deliveryInfo) {
                collectedDeliveryQuotes.push(deliveryInfo);
                controller.enqueue(sse("delivery", deliveryInfo));
              }
            }
            if (toolName === "kapruka_search_products" || toolName === "kapruka_list_categories") {
              const rawForLlm = extractProductsFromMcp(resultContent);
              const queryKey = String(toolArgs.q ?? "").toLowerCase().trim();
              const relFilter = CATEGORY_RELEVANCE_TERMS[queryKey];
              const irrelFilter = CATEGORY_IRRELEVANCE_TERMS[queryKey];
              const filteredForLlm = relFilter
                ? rawForLlm.filter((p) => {
                    const txt = `${p.name} ${p.category ?? ""}`;
                    return relFilter.test(txt) && !(irrelFilter?.test(txt));
                  })
                : rawForLlm;
              collectedProducts.push(...(filteredForLlm.length > 0 ? filteredForLlm : rawForLlm));
            }
            if (toolName === "kapruka_create_order") {
              if (!sandboxCheckout) {
                checkoutInfo = extractCheckoutInfoFromMcp(resultContent);
                payLink = checkoutInfo?.checkoutUrl;
              }
              // Snapshot the recipient/delivery/gift details the model collected so a
              // later "order again" can pre-fill them.
              const clean = (v: unknown): string | undefined => {
                const s = typeof v === "string" ? v.trim() : "";
                return s ? s : undefined;
              };
              const rec = asRecord(toolArgs.recipient);
              const del = asRecord(toolArgs.delivery);
              const recipientName = clean(rec?.name);
              const recipientPhone = clean(rec?.phone);
              const deliveryCityValue = clean(del?.city);
              const deliveryAddress = clean(del?.address);
              const giftMessage = clean(toolArgs.gift_message ?? toolArgs.giftMessage);
              lastOrderArgs = {
                recipient: recipientName && recipientPhone
                  ? { name: recipientName, phone: recipientPhone }
                  : undefined,
                delivery: deliveryCityValue && deliveryAddress
                  ? { city: deliveryCityValue, address: deliveryAddress }
                  : undefined,
                giftMessage,
              };
            }
            if (toolName === "kapruka_track_order") {
              const tracking = extractTrackingFromMcp(resultContent);
              if (tracking) controller.enqueue(sse("tracking", tracking));
            }

            controller.enqueue(sse("stepDone", stepId));
            return { toolCall, toolName, resultText };
          }

          function isConnectionError(err: unknown): boolean {
            if (!(err instanceof Error)) return false;
            const msg = err.message.toLowerCase();
            return (
              msg.includes("connection") ||
              msg.includes("not connected") ||
              msg.includes("transport") ||
              msg.includes("closed") ||
              msg.includes("econnreset") ||
              msg.includes("socket") ||
              isMcpSessionExpiredError(err)
            );
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
        const START_MS = Date.now();
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          if (Date.now() - START_MS > 8000 && round >= 1) break;
          let response: Groq.Chat.Completions.ChatCompletion | undefined;

          // Emit "Thinking…" on the first call so the user sees immediate feedback.
          // Subsequent rounds are already explained by the tool-step labels above.
          if (round === 0) {
            controller.enqueue(sse("step", "Thinking…"));
          }

          // ── Model call with clean fallback ──────────────────────────────────
          // Inner loop retries with the next model on 429/413 WITHOUT consuming
          // a round slot — replaces the old `round--` hack. Labels let us break
          // or continue both loops independently.
          let rateExhausted = false;
          let failedGenHandled = false;
          let responseHadUnsafeBufferedText = false;

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
              const guardText = shouldGuardCatalogText(latestUserText, toolsCalledThisRequest);
              // Guarded shopping/catalog turns buffer the whole text response until
              // the stream completes, so post-tool hallucinated product/price claims
              // can still be rejected instead of leaking after a short lookahead.
              const pendingBuf: string[] = [];

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
                  if (guardText) {
                    pendingBuf.push(delta.content);
                  } else if (!streamedText) {
                    controller.enqueue(sse("token", delta.content));
                    streamedText = true;
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

              // Flush guarded response text only after the completed response
              // validates against live products/delivery/checkout facts.
              if (pendingBuf.length > 0) {
                const unsafe = isUnsafeCatalogClaim({
                  text: sContent,
                  products: collectedProducts,
                  deliveryQuotes: collectedDeliveryQuotes,
                  checkoutInfo,
                  latestUserText,
                  budget,
                });
                if (unsafe) {
                  responseHadUnsafeBufferedText = true;
                } else {
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
            // Guarded catalog text is buffered until this validation passes, so
            // post-tool unsafe price/product claims can still be retried even
            // after earlier safe "checking..." prose was streamed.
            const unsafeCatalogClaim = isUnsafeCatalogClaim({
              text: finalText,
              products: collectedProducts,
              deliveryQuotes: collectedDeliveryQuotes,
              checkoutInfo,
              latestUserText,
              budget,
            });
            if (
              (!streamedText || responseHadUnsafeBufferedText) &&
              finalText &&
              unsafeCatalogClaim &&
              round < MAX_TOOL_ROUNDS - 1 &&
              hallucinationRetries < 1
            ) {
              hallucinationRetries++;
              // Preserve any previously-safe tokens, but the unsafe current
              // response was not emitted because it was buffered.
              currentMessages.push({ role: "assistant", content: finalText });
              currentMessages.push({
                role: "user",
                content:
                  "You mentioned product/price/delivery facts that were not " +
                  "verified by Kapruka tool results in this turn. Do not quote " +
                  "any products, prices, fees, delivery dates, or availability " +
                  "you have not fetched from Kapruka. Search/check now, then respond.",
              });
              finalText = "";
              continue; // retry with correction injected
            }

            if (responseHadUnsafeBufferedText && unsafeCatalogClaim) {
              finalText = L("troubleConnecting", language);
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
            // of foreign-script chars in an EN reply is expected and correct.
            // Strip known product names before calculating the prose ratio.
            const proseOnly = stripKnownProductNames(finalText, collectedProducts);
            const sChars = (proseOnly.match(/[඀-෿]/g) ?? []).length;
            const tChars = (proseOnly.match(/[஀-௿]/g) ?? []).length;
            if ((sChars + tChars) / Math.max(proseOnly.length, 1) > 0.20) {
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
        if (checkoutInfo) {
          controller.enqueue(sse("checkout", checkoutInfo));
          if (cart.length > 0) {
            const saved: LastOrder = {
              orderRef: checkoutInfo.orderRef,
              items: cart,
              recipient: lastOrderArgs?.recipient,
              delivery: lastOrderArgs?.delivery,
              giftMessage: lastOrderArgs?.giftMessage,
              placedAt: Date.now(),
            };
            controller.enqueue(sse("lastOrder", saved));
            // Surface the concrete server-generated order ref. The prompt already
            // tells the model to give the "order again" nudge, but it can't reliably
            // emit the real ref (esp. if create_order lands on the final tool round),
            // so this token adds that one genuinely-new fact without restating the
            // nudge. Appended as tokens so it lands in the same assistant bubble
            // (streamingMsgIdRef still set).
            if (checkoutInfo.orderRef) {
              controller.enqueue(
                sse(
                  "token",
                  "\n\n" +
                    Lf("postOrderSaved", language, {
                      orderRef: checkoutInfo.orderRef,
                    })
                )
              );
            }
          }
        }
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
