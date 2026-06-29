import { parseRelativeDeliveryDate } from "@/lib/colombo-date";
import { callMcpTool, getMcpClient } from "@/lib/mcp-client";
import { resolveMcpProductId } from "@/lib/product-id";
import {
  extractDeliveryInfoFromMcp,
  extractProductsFromMcp,
  extractTrackingFromMcp,
  parseMcpPayload,
} from "@/lib/mcp-parsing";
import { parseBudgetAmount } from "@/lib/kira/catalog-guard";
import { L, Lf } from "@/lib/kira/localization";
import {
  BAKERY_BRANDS,
  CATEGORY_IRRELEVANCE_TERMS,
  CATEGORY_RELEVANCE_TERMS,
  GLOBAL_SHOP_RE,
  HAMPER_RE,
  REORDER_REF_RE,
  REORDER_SESSION_RE,
  REPAIR_GIFT_RE,
  RUSH_RE,
  SALE_RE,
  buildReasonBadges,
  cartItemsToProducts,
  dedupeProducts,
  extractCityHint,
  extractFirstCity,
  extractLastSearchContext,
  extractOccasionHint,
  extractOrderNumber,
  extractProductKeyword,
  extractRecipientHint,
  fallbackQuery,
  parseSearchIntent,
  productsFromTrackingItems,
} from "@/lib/kira/search";
import { sse, streamWords, TOOL_STEPS } from "@/lib/kira/sse";
import type { CartItem, DeliveryQuote, KiraProduct, LastOrder } from "@/types";

// Matches short "show me" / "can i see them" re-show requests with no product query.
export const RESHOW_RE = /^(show\s*(me|them|these)?|can\s+i\s+see(\s+them)?|let\s+me\s+see(\s+them)?)[\.\?\!]?$/i;

// Matches "add it/that/this/the first one to cart/tray/basket"
export const ADD_TO_CART_RE =
  /\b(add|put|toss|throw)\b.{0,30}\b(it|that|this|the\s+(?:first|second|third|1st|2nd|3rd|\d+(?:st|nd|rd|th)?)\s+one|them|all)\b.{0,30}\b(cart|tray|basket|bag)\b|\b(add\s+(?:it|that|this)\s+to\s+(?:my\s+)?(?:cart|tray|basket))\b/i;

// Matches "list them as text", "can u list those", "enumerate the items" etc.
// Fires ONLY when lastProducts exists so "them" unambiguously refers to shown products.
export const LIST_AS_TEXT_RE =
  /\b(list|enumerate)\b.{0,25}\b(them|those|these|the\s+(?:items?|products?|options?|picks?))\b/i;

// Matches "show me those/them as pictures/cards/photos/images/listings" and similar referential re-show requests.
// These refer to previously mentioned specific products, not a new search.
export const RESHOW_AS_CARDS_RE =
  /\b(show|see|view|display)\b.{0,40}\b(those|them|it|the[ms]e)\b.{0,40}\b(picture|photo|image|card|visual|pic|listing|listings)\b/i;
// Also catches "can u show them to me", "can u show me those two items as pictures" etc.
export const RESHOW_THOSE_RE =
  /\b(show\s+me|show\s+us|can\s+(?:you|u)\s+show(?:\s+(?:me|them|those|it))?\b|let\s+me\s+see)\b.{0,30}\b(those|them|the[ms]e|the\s+(?:two|three|four|\d))\b/i;

export async function tryHandleDeterministicPrompt({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  lastProducts,
  lastOrder,
  language,
  mcpClient,
  controller,
  budget,
  occasion,
  recipient,
  internationalMode,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  lastProducts?: KiraProduct[];
  lastOrder?: LastOrder;
  language: string;
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  budget?: string;
  occasion?: string;
  recipient?: string;
  internationalMode?: boolean;
}): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // ── Empty / whitespace input ─────────────────────────────────────────────
  // Return a friendly prompt rather than a terse one-liner.
  if (!trimmed) {
    await streamWords(controller, L("emptyGreeting", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Jailbreak / persona-change intercept ─────────────────────────────────
  // "pretend you're a different AI", "act as X", "ignore your instructions" etc.
  // Catch before any search logic so the LLM never gets a chance to comply.
  const GREETING_RE = /^(hi|hello|hey|yo|ayubowan|ආයුබෝවන්|வணக்கம்)[\s!.]*$/i;
  if (GREETING_RE.test(trimmed)) {
    await streamWords(controller, L("greetingQuick", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const CART_CONTENTS_RE =
    /\b(what'?s in (?:my )?(?:cart|tray|basket)|show (?:my )?(?:cart|tray)|cart contents|my tray)\b/i;
  if (CART_CONTENTS_RE.test(lower)) {
    if (cart.length === 0) {
      await streamWords(controller, L("checkoutEmptyCart", language));
    } else {
      const lines = cart
        .map(
          (i, idx) =>
            `${idx + 1}. **${i.product.name}** ×${i.quantity} — LKR ${(i.product.price * i.quantity).toLocaleString("en-LK")}`
        )
        .join("\n");
      const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      await streamWords(
        controller,
        `Your tray:\n\n${lines}\n\nSubtotal: **LKR ${total.toLocaleString("en-LK")}**`
      );
    }
    controller.enqueue(sse("done"));
    return true;
  }

  const PRICE_SORT_RE =
    /\b(cheapest|lowest price|most expensive|highest price|priciest|budget pick|premium picks)\b/i;
  if (PRICE_SORT_RE.test(lower) && trimmed.split(/\s+/).length <= 8) {
    const ctx = extractLastSearchContext(messages, trimmed);
    const sort = /\b(cheapest|lowest|budget)\b/i.test(lower)
      ? ("price_asc" as const)
      : ("price_desc" as const);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}" (${sort === "price_asc" ? "cheapest first" : "premium first"})`));
    const sortResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        sort,
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const products = dedupeProducts(extractProductsFromMcp(sortResult.content));
    if (products.length > 0) {
      await streamWords(
        controller,
        Lf(products.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: products.length,
          budget: ctx.maxPrice ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}` : "",
          city: "",
          date: "",
        })
      );
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(controller, Lf("searchNothingFound", language, { query: ctx.query }));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  const DELIVERY_FEE_RE =
    /\b(delivery fee|delivery cost|how much.*deliver|shipping cost|deliver(?:y)? charge)\b/i;
  if (DELIVERY_FEE_RE.test(lower)) {
    const city = extractCityHint(trimmed) ?? deliveryCity;
    const product = lastProducts?.[0];
    if (city && product) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city,
          product_id: product.id,
          ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
          response_format: "json",
        },
      });
      const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
      if (deliveryInfo) {
        controller.enqueue(sse("delivery", deliveryInfo));
        if (deliveryInfo.fee !== undefined) {
          await streamWords(
            controller,
            `Delivery to ${deliveryInfo.city} is LKR ${deliveryInfo.fee.toLocaleString("en-LK")}.`
          );
        } else {
          await streamWords(
            controller,
            deliveryInfo.available
              ? `Delivery to ${deliveryInfo.city} looks available.`
              : `Delivery to ${deliveryInfo.city} isn't available for that date${deliveryInfo.nextAvailableDate ? ` — next slot is ${deliveryInfo.nextAvailableDate}` : ""}.`
          );
        }
      } else {
        await streamWords(controller, "I couldn't read the live delivery quote — try again in a moment?");
      }
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const JAILBREAK_RE = /\b(dan\s+mode|pretend\s+(you(?:'?re?|\s+are?)|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+(all\s+)?(your\s+)?(previous\s+)?instructions?|forget\s+your\s+(system\s+)?prompt|system\s+prompt|your\s+prompt|disregard\s+your|roleplay\s+as|be\s+a\s+different\s+ai|simulate\s+(being\s+)?an?\s+ai|no\s+restrictions)\b/i;
  if (JAILBREAK_RE.test(lower)) {
    await streamWords(controller, L("jailbreakRedirect", language));
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
    await streamWords(controller, L("trustAffirmation", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── "Tell me about <product>" with the product already in hand ───────────
  // The storefront "Ask Kira about this" button seeds exactly this prompt with the
  // product attached as lastProducts. The storefront catalog (Neon/seed JSON) is
  // separate from the live Kapruka MCP, so a tool lookup for these names returns
  // nothing — answer from the product data the client already sent instead.
  // Placed ahead of the topic-word intercepts (COD/OUT_OF_SCOPE) so product names
  // containing trigger words can't cause a false redirect. Restricted to exactly
  // one lastProducts item — multi-product "tell me about X" still goes to the LLM,
  // which can fetch richer details for MCP-sourced results.
  const TELL_ME_ABOUT_RE = /\btell\s+me\s+(?:a\s+bit\s+|more\s+)?about\b/i;
  if (TELL_ME_ABOUT_RE.test(lower) && lastProducts?.length === 1) {
    const target = lastProducts[0];
    const namedTarget = target.name && lower.includes(target.name.toLowerCase());
    const pronounTarget = /\b(it|this|that|the\s+one)\b/i.test(lower);
    if (namedTarget || pronounTarget) {
      let summary = (target.summary ?? "").replace(/\s+/g, " ").trim();
      if (summary && !/[.!?]$/.test(summary)) summary += ".";
      await streamWords(
        controller,
        Lf(
          target.inStock === false ? "aboutProductOutOfStock" : "aboutProductInStock",
          language,
          {
            name: target.name,
            price: `LKR ${target.price.toLocaleString("en-LK")}`,
            category: target.category ? ` (${target.category})` : "",
            summary: summary ? ` ${summary}` : "",
          }
        )
      );
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const COD_RE = /\b(cash\s+on\s+delivery|cod|pay\s+cash|cash\s+payment|payment\s+method|how\s+can\s+i\s+pay)\b/i;
  if (COD_RE.test(lower)) {
    await streamWords(controller, L("codPolicy", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const DELIVERY_POLICY_RE = /\b(cut-?off|same-?day|delivery\s+time|deliver\s+today|today\s+delivery|how\s+late)\b/i;
  if (DELIVERY_POLICY_RE.test(lower) && !/\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|roses)\b/i.test(lower)) {
    await streamWords(controller, L("deliveryPolicy", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const OUT_OF_SCOPE_RE =
    /\b(weather|flight|restaurant|translate|cover letter|quantum|homework|cricket|time in|what time|world clock|loan|poem|movie|doctor|appointment|call someone|job in|forex|lkr rate|joke|hack|instagram|girlfriend broke|lonely|be my friend|pizza)\b/i;
  const overseasCurrencyQuery =
    internationalMode && /\b(usd|dollars?|pounds?|aud|gbp)\b/i.test(lower);
  if (OUT_OF_SCOPE_RE.test(lower) && !overseasCurrencyQuery) {
    await streamWords(controller, L("outOfScopeRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const mixedForeignScriptCount = [
    /[\u0D80-\u0DFF]/, // Sinhala
    /[\u0B80-\u0BFF]/, // Tamil
    /[\u0900-\u097F]/, // Devanagari
    /[\u4E00-\u9FFF]/, // CJK
  ].filter((pattern) => pattern.test(trimmed)).length;
  if (
    language === "en" &&
    mixedForeignScriptCount >= 2 &&
    /\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|rose|bouquet)\b/i.test(lower)
  ) {
    await streamWords(controller, L("mixedScriptAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (
    language === "en" &&
    /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(trimmed) &&
    /(?:\b(?:send|deliver|delivery)\b|යවන්න|அனுப்பு|டெலிவரி)/i.test(trimmed) &&
    !/\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|rose|bouquet)\b/i.test(lower)
  ) {
    await streamWords(controller, L("englishModeScriptAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const VAGUE_RE =
    /^(i\s+need\s+something|just\s+a\s+gift|something\s+(nice|for\s+(my\s+)?(friend|wife|husband|mum|mom|dad|kid|girl|boy|someone)|sweet)|can\s+you\s+help\s+me\s+pick\s+something|i\s+don'?t\s+know\s+what\s+to\s+get|rs\s*[\d,]+\s+budget,?\s*go|under\s+[\d,]+|i\s+saw\s+something\s+here\s+before|amma\s+ta)$/i;
  if (VAGUE_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const FAMILY_GIFT_ASK_RE =
    /\b(amma|thaththa|thaththaa|acca|akka|aiya|malli|nangi|nona)\s+(ta|ge|for)\b.{0,50}\b(gift|ganna|ona|one)\b/i;
  if (FAMILY_GIFT_ASK_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (
    /\b(i am looking for a really good gift|looking for a really good gift)\b/i.test(lower)
  ) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const VAGUE_HELP_RE =
    /\b(i want to send something|i need it by|something for (?:a|my)?\s*(girl|guy|kid)|mum'?s birthday|surprise for my wife|something nice lah|treat someone|help me pick something|flowers or chocolates|i'?m in \w+,?\s*help me|anything for guys)\b/i;
  if (VAGUE_HELP_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^[\W_]*[🎂🎁🌸💐❤️🔥\s]+$/u.test(trimmed)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^[a-z]{6,}(?:\s+[a-z]{5,})+$/i.test(trimmed)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^'?;\s*drop\b|drop\s+table|--\s*$/i.test(lower)) {
    await streamWords(controller, L("outOfScopeRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^(?:\+?94|0)\d{9}$/i.test(trimmed.replace(/[\s-]/g, ""))) {
    await streamWords(
      controller,
      "Got the phone number. What product should I add to the order first?"
    );
    controller.enqueue(sse("done"));
    return true;
  }

  if (/\b(what categories|which categories|browse categories|list categories)\b/i.test(lower)) {
    await streamWords(
      controller,
      "Kapruka is strongest for cakes, flowers, chocolates, hampers, clothing, electronics, toys, grocery, and home gifts. What category should I open first?"
    );
    controller.enqueue(sse("done"));
    return true;
  }

  // Delivery request with no concrete product/city — keep it deterministic and
  // safe instead of letting the LLM invent logistics.
  if (
    /\bdeliver(?:y)?\s+to\b/i.test(lower) &&
    !extractCityHint(trimmed) &&
    !extractProductKeyword(lower)
  ) {
    await streamWords(
      controller,
      "Tell me the Sri Lankan city and the product you want to send, and I'll check live Kapruka delivery."
    );
    controller.enqueue(sse("done"));
    return true;
  }

  // Check if the previous assistant turn was asking for an order number — if so, treat
  // this message as the order number reply even without "track" in it.
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const kiraJustAskedForOrderNumber = lastAssistantMsg.includes("order number") || lastAssistantMsg.includes("order_number") || lastAssistantMsg.includes("confirmation email");
  const looksLikeOrderNumber = /^[A-Z0-9]{5,20}$/i.test(trimmed.replace(/\s+/g, ""));
  const TRACKING_VERB_RE = /\b(track|tracking|status|where(?:'s| is)|locate|find)\b/i;
  const TRACKING_NOUN_RE = /\b(order|delivery|package|parcel|shipment)\b/i;

  const wantsTracking =
    (TRACKING_VERB_RE.test(lower) && TRACKING_NOUN_RE.test(lower)) ||
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

  // Short referential follow-up after a product search — "now?" / "what now?"
  // should recover the last search rather than falling into a model call.
  if (/^(now|what now|and now)[\?\!.]*$/i.test(trimmed)) {
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
    const products = dedupeProducts(extractProductsFromMcp(reshowResult.content));
    if (products.length > 0) {
      await streamWords(
        controller,
        Lf(products.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: products.length,
          budget: "",
          city: "",
          date: "",
        })
      );
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(controller, Lf("searchNothingFound", language, { query: ctx.query }));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Reorder by order reference (KP-xxxxx) ───────────────────────────────
  const reorderRefMatch = trimmed.match(REORDER_REF_RE);
  if (reorderRefMatch) {
    const orderNumber = reorderRefMatch[1].replace(/\s+/g, "").toUpperCase();
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_track_order));
    const trackingResult = await callMcpTool(mcpClient, "kapruka_track_order", {
      params: { order_number: orderNumber, response_format: "json" },
    });
    const tracking = extractTrackingFromMcp(trackingResult.content);
    if (tracking?.items?.length) {
      const products = await productsFromTrackingItems(mcpClient, tracking.items);
      if (products.length > 0) {
        await streamWords(
          controller,
          Lf("reorderFromRef", language, { orderNumber: tracking.orderNumber || orderNumber })
        );
        controller.enqueue(sse("products", products));
        controller.enqueue(sse("tracking", tracking));
      } else {
        await streamWords(
          controller,
          Lf("reorderRefNotFound", language, { orderNumber })
        );
      }
    } else {
      await streamWords(
        controller,
        Lf("reorderRefNotFound", language, { orderNumber })
      );
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Within-session reorder ─────────────────────────────────────────────
  if (REORDER_SESSION_RE.test(lower)) {
    const source = lastOrder?.items?.length ? lastOrder : cart.length > 0 ? { items: cart, placedAt: Date.now() } : null;
    if (source?.items?.length) {
      const products = cartItemsToProducts(source.items);
      await streamWords(controller, L("reorderSessionFound", language));
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(controller, L("reorderNoHistory", language));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Global Shop (coming soon) ────────────────────────────────────────────
  if (GLOBAL_SHOP_RE.test(lower)) {
    await streamWords(controller, L("globalShopSoon", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Emotional repair — warm friend + Kapruka delivery to recipient ─────
  const repairProductKw = extractProductKeyword(lower);
  if (REPAIR_GIFT_RE.test(lower) && repairProductKw) {
    await streamWords(controller, L("repairGiftSearchIntro", language));
    controller.enqueue(sse("step", `Searching Kapruka for "${repairProductKw}"`));
    let repairProducts: KiraProduct[] = [];
    for (const q of [repairProductKw, fallbackQuery(repairProductKw)]) {
      if (!q) continue;
      const repairResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: { q, limit: 6, in_stock_only: true, response_format: "json" },
      });
      let batch = extractProductsFromMcp(repairResult.content);
      const relevanceFilter = CATEGORY_RELEVANCE_TERMS[q];
      const irrelevanceFilter = CATEGORY_IRRELEVANCE_TERMS[q];
      if (relevanceFilter) {
        batch = batch.filter((p) => {
          const txt = `${p.name} ${p.category ?? ""}`;
          return relevanceFilter.test(txt) && !(irrelevanceFilter?.test(txt));
        });
      }
      repairProducts = dedupeProducts([...repairProducts, ...batch]);
      if (repairProducts.length >= 3) break;
    }
    const repairCity = extractCityHint(trimmed) ?? deliveryCity;
    if (repairProducts.length === 0) {
      await streamWords(
        controller,
        Lf("searchNothingFound", language, { query: repairProductKw })
      );
    } else {
      const cityText = repairCity ? ` to ${repairCity}` : "";
      const key = repairProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
      await streamWords(
        controller,
        Lf(key, language, {
          n: repairProducts.length,
          budget: "",
          city: cityText,
          date: "",
        })
      );
      controller.enqueue(sse("products", repairProducts));
      if (repairCity && repairProducts[0]) {
        controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
        const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
          params: {
            city: repairCity,
            product_id: repairProducts[0].id,
            ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
            response_format: "json",
          },
        });
        const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
        if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
      }
    }
    controller.enqueue(sse("done"));
    return true;
  }
  if (REPAIR_GIFT_RE.test(lower)) {
    await streamWords(controller, L("repairGiftAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const PHONE_RE = /(?:\+?94|0)\s*\d(?:[\s-]?\d){7,9}\b/;
  const ADDRESS_RE =
    /\b(?:address|street|st\.?|road|rd\.?|mawatha|lane|galle\s+rd|main\s+st|flower\s+road)\b|\b\d{1,4}\s+[a-z][a-z\s.]{2,30}\b/i;
  // Only collect partial checkout fields once the tray has items — otherwise
  // "send flowers to 12 Galle Road" gets misread as checkout field collection.
  if (cart.length > 0) {
    const hasPhone = PHONE_RE.test(trimmed);
    const hasAddress = ADDRESS_RE.test(trimmed);
    if (hasAddress && !hasPhone) {
      await streamWords(controller, L("checkoutNeedPhone", language));
      controller.enqueue(sse("done"));
      return true;
    }
    if (hasPhone && !hasAddress) {
      await streamWords(controller, L("checkoutNeedAddress", language));
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const simpleProductQuery =
    extractProductKeyword(lower) ??
    (/කේක්|கேக்/i.test(trimmed) ? "cake" : null) ??
    (/මල්|பூ|மலர்/i.test(trimmed) ? "flowers" : null) ??
    (/\bbooks?\b/i.test(lower) ? "books" : null) ??
    (/\bstationary\b/i.test(lower) ? "stationery" : null);
  const hasDeliveryToRecipient =
    /\bto\s+(my\s+)?(wife|husband|her|him|gf|girlfriend|boyfriend|partner|office|home)\b/i.test(
      lower
    ) || /\bdeliver(?:y)?\s+to\b/i.test(lower);
  const hasSimpleProductIntent =
    !!simpleProductQuery &&
    (/\b(show|search|want|need|looking for|send|buy|get|order|deliver)\b/i.test(lower) ||
      hasDeliveryToRecipient ||
      /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(trimmed) ||
      /\b(vesak|birthday|anniversary)\b/i.test(lower) ||
      trimmed.toLowerCase() === simpleProductQuery ||
      lower === "stationary" ||
      /\bbooks?\s+na\b/i.test(lower));

  if (hasSimpleProductIntent) {
    const productDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const productCity = extractCityHint(trimmed) ?? deliveryCity;
    const maxPrice = parseBudgetAmount(trimmed) ?? parseBudgetAmount(budget);

    if (
      /\b(fresh|perishable)\b/i.test(lower) &&
      /\bcake\b/i.test(lower) &&
      !parseRelativeDeliveryDate(trimmed) &&
      !deliveryDate
    ) {
      await streamWords(
        controller,
        language === "si"
          ? "කේක් fresh හදන නිසා delivery date එක දෙන්නකෝ — අදද, හෙටද, නැත්නම් වෙන දවසක්ද?"
          : language === "ta"
          ? "Cake fresh item — delivery date சொல்லுங்கள்; today, tomorrow, அல்லது வேறு date?"
          : "Cakes are fresh-made, so I need the delivery date before I confirm availability."
      );
      controller.enqueue(sse("done"));
      return true;
    }

    controller.enqueue(sse("step", `Searching Kapruka for "${simpleProductQuery}"`));
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: simpleProductQuery,
        limit: 6,
        in_stock_only: true,
        ...(maxPrice ? { max_price: maxPrice } : {}),
        response_format: "json",
      },
    });
    const products = dedupeProducts(extractProductsFromMcp(searchResult.content));
    if (productCity && products[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: productCity,
          product_id: products[0].id,
          ...(productDate ? { delivery_date: productDate } : {}),
          response_format: "json",
        },
      });
      const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
      if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    }

    if (products.length > 0) {
      const budgetText = maxPrice ? ` under LKR ${maxPrice.toLocaleString("en-LK")}` : "";
      const cityText = productCity ? ` to ${productCity}` : "";
      const dateText = productDate ? ` on ${productDate}` : "";
      const isEmotionalSend =
        REPAIR_GIFT_RE.test(lower) ||
        /\b(machang|bro\b|mate\b|messed up|pissed|furious|angry|mad|fight|sorry)\b/i.test(lower);
      if (isEmotionalSend) {
        await streamWords(controller, L("repairGiftSearchIntro", language));
      }
      await streamWords(
        controller,
        Lf(products.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: products.length,
          budget: budgetText,
          city: cityText,
          date: dateText,
        })
      );
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(
        controller,
        Lf("searchNothingFound", language, { query: simpleProductQuery })
      );
    }
    controller.enqueue(sse("done"));
    return true;
  }

  const CART_DELIVERY_RE =
    /\b(check|refresh|confirm)\b.{0,24}\b(delivery|deliver)\b.{0,30}\b(cart|tray|basket|bag)\b|\b(cart|tray|basket|bag)\b.{0,30}\b(delivery|deliver)\b/i;
  if (CART_DELIVERY_RE.test(lower)) {
    if (cart.length === 0) {
      await streamWords(controller, L("checkoutEmptyCart", language));
      controller.enqueue(sse("done"));
      return true;
    }
    const city = extractCityHint(trimmed) ?? deliveryCity;
    const date = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    if (!city) {
      await streamWords(controller, "Tell me the delivery city and I'll check the live Kapruka fee for your tray.");
      controller.enqueue(sse("done"));
      return true;
    }
    const firstItem = cart[0];
    const idCache = new Map<string, string>();
    const productId = await resolveMcpProductId(mcpClient, firstItem, idCache);
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
    const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
      params: {
        city,
        product_id: productId,
        ...(date ? { delivery_date: date } : {}),
        response_format: "json",
      },
    });
    const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
    if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (deliveryInfo?.fee !== undefined) {
      await streamWords(
        controller,
        `Delivery to ${deliveryInfo.city} is LKR ${deliveryInfo.fee.toLocaleString("en-LK")}. Items are LKR ${subtotal.toLocaleString("en-LK")} — estimated total LKR ${(subtotal + deliveryInfo.fee).toLocaleString("en-LK")}.`
      );
    } else if (deliveryInfo) {
      await streamWords(
        controller,
        deliveryInfo.available
          ? `Delivery to ${deliveryInfo.city} looks available${date ? ` on ${date}` : ""}.`
          : `Delivery to ${deliveryInfo.city} is not available for that date${deliveryInfo.nextAvailableDate ? ` — next available is ${deliveryInfo.nextAvailableDate}` : ""}.`
      );
    } else {
      await streamWords(controller, "I couldn't read the live delivery quote for your tray. Try again in a moment?");
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "Add it/that/the first one to cart" — emit addToCart event so the client
  // can update the cart without a page interaction.
  if (ADD_TO_CART_RE.test(trimmed) && lastProducts && lastProducts.length > 0) {
    const lower = trimmed.toLowerCase();
    const addAll = /\b(all|them)\b/.test(lower);
    const idxMatch = lower.match(/\b(first|1st|second|2nd|third|3rd|(\d+)(?:st|nd|rd|th)?)\s+one\b/);
    const idx = idxMatch
      ? idxMatch[2]
        ? parseInt(idxMatch[2], 10) - 1
        : ["first","1st"].includes(idxMatch[1]) ? 0 : ["second","2nd"].includes(idxMatch[1]) ? 1 : 2
      : 0;
    const toAdd = addAll ? lastProducts : [lastProducts[Math.min(idx, lastProducts.length - 1)]];
    for (const p of toAdd) controller.enqueue(sse("addToCart", p));
    const names = toAdd.map((p) => p.name).join(", ");
    await streamWords(controller, `Done! Added **${names}** to your tray. Ready to checkout when you are.`);
    controller.enqueue(sse("done"));
    return true;
  }

  // "list them as text" / "can u list those" — user wants a numbered text list of the
  // products Kira just showed, NOT a description of the cart. Only fires when lastProducts
  // is populated so "them" unambiguously refers to the shown results.
  if (LIST_AS_TEXT_RE.test(lower) && lastProducts && lastProducts.length > 0 && !lower.includes("cart")) {
    const lines = lastProducts
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** — LKR ${p.price.toLocaleString("en-LK")}${
            p.inStock === false ? " *(out of stock)*" : ""
          }`
      )
      .join("\n");
    await streamWords(
      controller,
      `Here are the ${lastProducts.length} items I just showed you:\n\n${lines}`
    );
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
        limit: 9,
        in_stock_only: true,
        sort: "price_asc", // different angle from the default bestseller ordering
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const seenIds = new Set((lastProducts ?? []).map((p) => p.id));
    let moreProducts = extractProductsFromMcp(moreResult.content);
    const relevanceFilter = CATEGORY_RELEVANCE_TERMS[ctx.query];
    const irrelevanceFilter = CATEGORY_IRRELEVANCE_TERMS[ctx.query];
    if (relevanceFilter) {
      moreProducts = moreProducts.filter((p) => {
        const txt = `${p.name} ${p.category ?? ""}`;
        return relevanceFilter.test(txt) && !(irrelevanceFilter?.test(txt));
      });
    }
    moreProducts = dedupeProducts(moreProducts.filter((p) => !seenIds.has(p.id)));
    // If still empty after dedup, fall back to the full set without seen-ID filter
    if (moreProducts.length === 0) {
      moreProducts = dedupeProducts(extractProductsFromMcp(moreResult.content));
    }

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
    /\b(gift|present|something\s+(?:for|nice|to)|send something|make it up|what\s+(to\s+)?(buy|get|send)|father'?s\s+day|mother'?s\s+day|birthday\s+gift)\b/i;
  const SL_FAMILY_GIFT_RE =
    /\b(amma|thaththa|thaththaa|acca|akka|aiya|malli|nangi|nona)\s+(ta|ge|for)\b/i;
  const PRODUCT_RECIPIENT_RE =
    /\b(flowers?|cakes?|chocolates?|roses?|bouquet|hampers?)\b.{0,35}\bfor\s+(my\s+)?(wife|husband|mum|mom|dad|friend|girlfriend|boyfriend|amma|thaththa|thaththaa)\b/i;

  const hasBudgetHint = /\b(?:under|below|max|maximum|budget|lkr\s*\d)\b/i.test(lower);
  const hasOccasionHint = /\b(father'?s\s+day|mother'?s\s+day|birthday|avurudu|vesak|wedding|anniversary)\b/i.test(lower);
  const hasCityHint = !!extractCityHint(trimmed);
  const hasFamilyHint = SL_FAMILY_GIFT_RE.test(lower);
  const productRecipient = PRODUCT_RECIPIENT_RE.exec(lower);
  if (productRecipient && !hasBudgetHint && !hasOccasionHint && !hasCityHint) {
    await streamWords(
      controller,
      Lf("productRecipientAsk", language, {
        category: productRecipient[1].trim().toLowerCase(),
      })
    );
    controller.enqueue(sse("done"));
    return true;
  }
  // Only fire the gift fast-path when there's at least one concrete signal beyond the word "gift".
  // - "just a gift" / "amma ta" alone → fall through to LLM so it asks what kind of gift.
  // - "gift for dad under 3000" / "flowers for amma to Kandy" → fast-path is useful.
  // hasFamilyHint is intentionally NOT in the right-hand guard — a family term alone (no
  // budget/occasion/city) doesn't give us enough to search usefully.
  if ((GIFT_INTENT_RE.test(lower) || hasFamilyHint) && (hasBudgetHint || hasOccasionHint || hasCityHint)) {
    const giftMaxPrice = parseBudgetAmount(trimmed) ?? parseBudgetAmount(budget);
    const giftCityHint = extractCityHint(trimmed) ?? deliveryCity;
    const giftDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const giftOccasion = extractOccasionHint(trimmed) ?? occasion;
    const giftRecipient = extractRecipientHint(trimmed) ?? recipient;

    controller.enqueue(
      sse("context", {
        ...(giftMaxPrice ? { budget: `Under LKR ${giftMaxPrice.toLocaleString("en-LK")}` } : {}),
        ...(giftCityHint ? { city: giftCityHint } : {}),
        ...(giftDate ? { deliveryDate: giftDate } : {}),
        ...(giftOccasion ? { occasion: giftOccasion } : {}),
        ...(giftRecipient ? { recipient: giftRecipient } : {}),
      })
    );

    const relationshipGift =
      /\b(girlfriend|boyfriend|wife|husband|partner)\b/i.test(giftRecipient ?? trimmed);
    const searchQueries =
      giftOccasion?.toLowerCase().includes("birthday") && relationshipGift
        ? ["flowers", "chocolate", "gift hamper", "cake"]
        : ["gift", "chocolate", "flowers", "hamper", "cake"];
    const giftProducts: KiraProduct[] = [];
    for (const query of searchQueries) {
      controller.enqueue(sse("step", `Searching Kapruka for "${query}"`));
      const giftResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: {
          q: query,
          limit: 6,
          in_stock_only: true,
          ...(giftMaxPrice ? { max_price: giftMaxPrice } : {}),
          response_format: "json",
        },
      });
      giftProducts.push(...extractProductsFromMcp(giftResult.content));
      if (dedupeProducts(giftProducts).length >= 6) break;
    }
    const dedupedGiftProducts = dedupeProducts(giftProducts).slice(0, 6);

    if (giftCityHint && dedupedGiftProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
      const giftCityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
        params: { query: giftCityHint, limit: 3, response_format: "json" },
      });
      const canonicalGiftCity = extractFirstCity(giftCityResult.content) ?? giftCityHint;
      const primaryProduct = dedupedGiftProducts[0];
      if (primaryProduct) {
        controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
        const giftDeliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
          params: {
            city: canonicalGiftCity,
            product_id: primaryProduct.id,
            ...(giftDate ? { delivery_date: giftDate } : {}),
            response_format: "json",
          },
        });
        const giftDelivery = extractDeliveryInfoFromMcp(giftDeliveryResult.content);
        if (giftDelivery) {
          primaryProduct.deliveryInfo = giftDelivery;
          controller.enqueue(sse("delivery", giftDelivery));
        }
      }

      for (const product of dedupedGiftProducts) {
        product.badges = buildReasonBadges(product, {
          budgetAmount: giftMaxPrice,
          occasion: giftOccasion,
          recipient: giftRecipient,
          city: canonicalGiftCity,
          deliveryDate: giftDate,
          deliveryInfo: product.deliveryInfo ?? primaryProduct?.deliveryInfo,
        });
      }
    }

    if (dedupedGiftProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: "gift" }));
    } else {
      const budgetText = giftMaxPrice ? ` under LKR ${giftMaxPrice.toLocaleString("en-LK")}` : "";
      const cityText = giftCityHint ? ` to ${giftCityHint}` : "";
      const dateText = giftDate ? ` on ${giftDate}` : "";
      const checkedDeliveries = dedupedGiftProducts
        .map((product) => product.deliveryInfo)
        .filter((info): info is DeliveryQuote => Boolean(info));
      const hasUnavailableForRequestedDate = checkedDeliveries.some(
        (info) => info.available === false
      );
      if (hasUnavailableForRequestedDate && giftCityHint && giftDate) {
        await streamWords(
          controller,
          `Here are ${dedupedGiftProducts.length} real Kapruka picks${budgetText}${cityText}. Delivery badges show the exact date confidence — some may need the next available slot after ${giftDate}.`
        );
      } else {
        const giftKey = dedupedGiftProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
        await streamWords(
          controller,
          Lf(giftKey, language, { n: dedupedGiftProducts.length, budget: budgetText, city: cityText, date: dateText })
        );
      }
      controller.enqueue(sse("products", dedupedGiftProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Hamper / combo explicit ──────────────────────────────────────────────
  if (HAMPER_RE.test(lower) && !parseSearchIntent(trimmed)) {
    controller.enqueue(sse("step", `Searching Kapruka for gift sets`));
    const hamperResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: "gift set", limit: 6, in_stock_only: true, sort: "bestseller", response_format: "json" },
    });
    const hamperProducts = dedupeProducts(extractProductsFromMcp(hamperResult.content));
    if (hamperProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: "gift set" }));
    } else {
      await streamWords(controller, Lf("searchFoundMany", language, { n: hamperProducts.length, budget: "", city: "", date: "" }));
      controller.enqueue(sse("products", hamperProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Sale / deals ─────────────────────────────────────────────────────────
  if (SALE_RE.test(lower) && !parseSearchIntent(trimmed)) {
    const saleQuery = extractProductKeyword(lower) ?? "gift";
    controller.enqueue(sse("step", `Searching Kapruka for budget picks`));
    const saleResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: saleQuery, limit: 6, in_stock_only: true, sort: "price_asc", response_format: "json" },
    });
    const saleProducts = dedupeProducts(extractProductsFromMcp(saleResult.content));
    if (saleProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: saleQuery }));
    } else {
      await streamWords(controller, L("saleSearchIntro", language));
      controller.enqueue(sse("products", saleProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Rush / same-day ──────────────────────────────────────────────────────
  if (RUSH_RE.test(lower)) {
    const rushQuery = extractProductKeyword(lower) ?? "flowers";
    const rushCity = extractCityHint(trimmed) ?? deliveryCity ?? "Colombo";
    const todayIso = new Date().toISOString().slice(0, 10);
    controller.enqueue(sse("step", `Searching Kapruka for same-day ${rushQuery}`));
    const rushResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: rushQuery, limit: 6, in_stock_only: true, sort: "price_asc", response_format: "json" },
    });
    let rushProducts = dedupeProducts(extractProductsFromMcp(rushResult.content));
    if (rushProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const rushDeliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: rushCity,
          product_id: rushProducts[0].id,
          delivery_date: todayIso,
          response_format: "json",
        },
      });
      const rushDelivery = extractDeliveryInfoFromMcp(rushDeliveryResult.content);
      if (rushDelivery?.available === false) {
        rushProducts = rushProducts.slice(0, 3);
      }
      if (rushDelivery) controller.enqueue(sse("delivery", rushDelivery));
    }
    if (rushProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: rushQuery }));
    } else {
      await streamWords(
        controller,
        Lf("rushSearchIntro", language, { city: rushCity, date: "today" })
      );
      controller.enqueue(sse("products", rushProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Bakery / brand filter ────────────────────────────────────────────────
  const brandMatch = Object.entries(BAKERY_BRANDS).find(([brand]) => lower.includes(brand));
  if (brandMatch && /\bcake\b/i.test(lower)) {
    const [, brandQuery] = brandMatch;
    controller.enqueue(sse("step", `Searching Kapruka for ${brandQuery} cakes`));
    const brandResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: `${brandQuery} cake`, limit: 6, in_stock_only: true, response_format: "json" },
    });
    const brandProducts = dedupeProducts(extractProductsFromMcp(brandResult.content));
    if (brandProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: `${brandQuery} cake` }));
    } else {
      await streamWords(
        controller,
        Lf("searchFoundMany", language, { n: brandProducts.length, budget: "", city: "", date: "" })
      );
      controller.enqueue(sse("products", brandProducts));
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
    /\b(cake|birthday\s+cake|chocolates?|flowers?|bouquet|roses?|hamper|gift\s+hamper|perfume|saree|toys?|electronics?|teddy|candles?|cookie|biscuit)\b.{0,40}\b(under|below|max|budget)\s*(?:lkr\s*)?([\d,]+)/i;
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
            params: {
              city: cityHint,
              product_id: bareProducts[0].id,
              ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
              response_format: "json",
            },
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
  const contextMaxPrice = searchIntent.maxPrice ?? parseBudgetAmount(budget);

  controller.enqueue(sse("step", `Searching Kapruka for "${searchIntent.query}"`));
  let products: KiraProduct[] = [];

  for (const query of [searchIntent.query, fallbackQuery(searchIntent.query)]) {
    if (!query) continue;
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: query,
        limit: 6,
        in_stock_only: true,
        ...(contextMaxPrice ? { max_price: contextMaxPrice } : {}),
        ...(searchIntent.sort ? { sort: searchIntent.sort } : {}),
        response_format: "json",
      },
    });
    let batch = extractProductsFromMcp(searchResult.content);
    const relevanceFilter = CATEGORY_RELEVANCE_TERMS[query];
    if (relevanceFilter) {
      batch = batch.filter(
        (p) => relevanceFilter.test(p.name) || relevanceFilter.test(p.category ?? "")
      );
    }
    products = dedupeProducts([...products, ...batch]);
    if (products.length >= 3) break;
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
    const budgetText = contextMaxPrice
      ? ` under LKR ${contextMaxPrice.toLocaleString("en-LK")}`
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
