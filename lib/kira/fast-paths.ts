import { parseRelativeDeliveryDate } from "@/lib/colombo-date";
import { callMcpTool, getMcpClient } from "@/lib/mcp-client";
import { resolveMcpProductId } from "@/lib/product-id";
import {
  extractDeliveryInfoFromMcp,
  extractProductsFromMcp,
  extractTrackingFromMcp,
  parseMcpPayload,
} from "@/lib/mcp-parsing";
import { handleCheckoutFillIn, isCheckoutFillInTurn } from "@/lib/kira/checkout-flow";
import { tryHandleSearchFastPath } from "@/lib/kira/search-fast-paths";
import { L, Lf } from "@/lib/kira/localization";
import {
  REORDER_REF_RE,
  REORDER_SESSION_RE,
  cartItemsToProducts,
  dedupeProducts,
  extractCityHint,
  extractLastSearchContext,
  extractOrderNumber,
  buildMessageFilterContext,
  fetchFreshMoreProducts,
  filterFamilySafeProducts,
  filterProductsForSearch,
  productIds,
  productsFromTrackingItems,
} from "@/lib/kira/search";
import { sse, streamWords, TOOL_STEPS } from "@/lib/kira/sse";
import type { CartItem, KiraProduct, LastOrder } from "@/types";

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
export const RESHOW_AS_CARDS_RE =
  /\b(show|see|view|display)\b.{0,40}\b(those|them|it|the[ms]e)\b.{0,40}\b(picture|photo|image|card|visual|pic|listing|listings)\b/i;

export const RESHOW_THOSE_RE =
  /\b(show\s+me|show\s+us|can\s+(?:you|u)\s+show(?:\s+(?:me|them|those|it))?\b|let\s+me\s+see)\b.{0,30}\b(those|them|the[ms]e|the\s+(?:two|three|four|\d))\b/i;

export async function tryHandleDeterministicPrompt({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  lastProducts,
  shownProducts,
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
  shownProducts?: KiraProduct[];
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
  if (!trimmed) {
    await streamWords(controller, L("emptyGreeting", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Cart contents ────────────────────────────────────────────────────────
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

  // ── Jailbreak / persona-change intercept ────────────────────────────────
  const JAILBREAK_RE = /\b(dan\s+mode|pretend\s+(you(?:'?re?|\s+are?)|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+(all\s+)?(your\s+)?(previous\s+)?instructions?|forget\s+your\s+(system\s+)?prompt|system\s+prompt|your\s+prompt|disregard\s+your|roleplay\s+as|be\s+a\s+different\s+ai|simulate\s+(being\s+)?an?\s+ai|no\s+restrictions)\b/i;
  if (JAILBREAK_RE.test(lower)) {
    await streamWords(controller, L("jailbreakRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Platform trust questions ─────────────────────────────────────────────
  const TRUST_RE = /\b(is\s+(kapruka|this|it)(\s+\w+){0,3}\s+(legit|safe|real|trusted?|reliable|genuine|authentic|scam)|can\s+i\s+trust\s+(kapruka|this|it)|kapruka\s+(legit|safe|real|trusted?|reliable))\b/i;
  if (TRUST_RE.test(lower)) {
    await streamWords(controller, L("trustAffirmation", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── COD / payment policy — zero tools ────────────────────────────────────
  const COD_RE =
    /\b(cash\s+on\s+delivery|\bcod\b|pay\s+cash|cash\s+payment|can\s+i\s+pay\s+cash)\b/i;
  if (COD_RE.test(lower)) {
    await streamWords(controller, L("codPolicy", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── "Tell me about <product>" with the product already in hand ───────────
  // The storefront "Ask Kira about this" button seeds exactly this prompt.
  // Storefront catalog (Neon/seed JSON) is separate from live Kapruka MCP so
  // a tool lookup returns nothing — answer from the product data already sent.
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

  // ── Order tracking ───────────────────────────────────────────────────────
  // Also handles the case where the user just types an order number after Kira
  // asked for one — no "track" keyword needed in that context.
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const kiraJustAskedForOrderNumber =
    lastAssistantMsg.includes("order number") ||
    lastAssistantMsg.includes("order_number") ||
    lastAssistantMsg.includes("confirmation email");
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
        params: { order_number: orderNumber, response_format: "json" },
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
        const reason = parsed.ok ? "I couldn't read the tracking details." : parsed.error;
        await streamWords(controller, Lf("trackingNotFound", language, { orderNumber, reason }));
      }
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
        controller.enqueue(sse("products", filterFamilySafeProducts(products)));
        controller.enqueue(sse("tracking", tracking));
      } else {
        await streamWords(controller, Lf("reorderRefNotFound", language, { orderNumber }));
      }
    } else {
      await streamWords(controller, Lf("reorderRefNotFound", language, { orderNumber }));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Within-session reorder ───────────────────────────────────────────────
  if (REORDER_SESSION_RE.test(lower)) {
    const source =
      lastOrder?.items?.length
        ? lastOrder
        : cart.length > 0
        ? { items: cart, placedAt: Date.now() }
        : null;
    if (source?.items?.length) {
      const products = cartItemsToProducts(source.items);
      await streamWords(controller, L("reorderSessionFound", language));
      controller.enqueue(sse("products", filterFamilySafeProducts(products)));
    } else {
      await streamWords(controller, L("reorderNoHistory", language));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Cart delivery check ──────────────────────────────────────────────────
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

  // ── Add to cart ──────────────────────────────────────────────────────────
  if (ADD_TO_CART_RE.test(trimmed) && lastProducts && lastProducts.length > 0) {
    const addAll = /\b(all|them)\b/.test(lower);
    const idxMatch = lower.match(/\b(first|1st|second|2nd|third|3rd|(\d+)(?:st|nd|rd|th)?)\s+one\b/);
    const idx = idxMatch
      ? idxMatch[2]
        ? parseInt(idxMatch[2], 10) - 1
        : ["first", "1st"].includes(idxMatch[1]) ? 0 : ["second", "2nd"].includes(idxMatch[1]) ? 1 : 2
      : 0;
    const toAdd = addAll ? lastProducts : [lastProducts[Math.min(idx, lastProducts.length - 1)]];
    for (const p of toAdd) controller.enqueue(sse("addToCart", p));
    const names = toAdd.map((p) => p.name).join(", ");
    await streamWords(controller, `Done! Added **${names}** to your tray. Ready to checkout when you are.`);
    controller.enqueue(sse("done"));
    return true;
  }

  // ── List products as text ────────────────────────────────────────────────
  if (LIST_AS_TEXT_RE.test(lower) && lastProducts && lastProducts.length > 0 && !lower.includes("cart")) {
    const lines = lastProducts
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** — LKR ${p.price.toLocaleString("en-LK")}${
            p.inStock === false ? " *(out of stock)*" : ""
          }`
      )
      .join("\n");
    await streamWords(controller, `Here are the ${lastProducts.length} items I just showed you:\n\n${lines}`);
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Re-show as cards ─────────────────────────────────────────────────────
  if (RESHOW_AS_CARDS_RE.test(trimmed) || RESHOW_THOSE_RE.test(trimmed)) {
    if (lastProducts && lastProducts.length > 0) {
      const reshowKey = lastProducts.length === 1 ? "reshowHereItemsSingle" : "reshowHereItems";
      await streamWords(
        controller,
        lastProducts.length === 1
          ? L(reshowKey, language)
          : Lf(reshowKey, language, { n: lastProducts.length })
      );
      controller.enqueue(sse("products", filterFamilySafeProducts(lastProducts)));
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
    const reshowProducts = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(reshowResult.content),
        ctx.query,
        buildMessageFilterContext(trimmed, messages)
      )
    );
    if (reshowProducts.length === 0) {
      await streamWords(controller, Lf("reshowNothingFoundQuery", language, { query: ctx.query }));
    } else {
      const budgetText = ctx.maxPrice ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}` : "";
      await streamWords(controller, Lf("reshowRealListings", language, { budget: budgetText, n: reshowProducts.length }));
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Checkout triggers ────────────────────────────────────────────────────
  if (lower.includes("ready to checkout") || lower.includes("complete the order")) {
    const message = cart.length === 0
      ? L("checkoutEmptyCart", language)
      : L("checkoutNeedName", language);
    await streamWords(controller, message);
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Re-show request ──────────────────────────────────────────────────────
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
    const reshowProducts = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(reshowResult.content),
        ctx.query,
        buildMessageFilterContext(trimmed, messages)
      )
    );
    if (reshowProducts.length === 0) {
      await streamWords(controller, L("reshowNothingInStock", language));
    } else {
      const budgetText = ctx.maxPrice ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}` : "";
      const reshowKey = reshowProducts.length === 1 ? "reshowHereYouGoOne" : "reshowHereYouGo";
      await streamWords(controller, Lf(reshowKey, language, { budget: budgetText, n: reshowProducts.length }));
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── "More options" ───────────────────────────────────────────────────────
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
    const excludeIds = productIds(shownProducts ?? lastProducts);
    const moreProducts = await fetchFreshMoreProducts({
      mcpClient,
      query: ctx.query,
      maxPrice: ctx.maxPrice,
      excludeIds,
      filterContext: buildMessageFilterContext(trimmed, messages),
      onStep: (label) => controller.enqueue(sse("step", label)),
    });
    if (moreProducts.length === 0) {
      await streamWords(
        controller,
        excludeIds.size > 0
          ? L("moreOptionsSamePicks", language)
          : Lf("moreOptionsAboutAll", language, { query: ctx.query })
      );
    } else {
      const budgetText = ctx.maxPrice ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}` : "";
      await streamWords(controller, Lf("moreOptionsHere", language, { budget: budgetText }));
      controller.enqueue(sse("products", moreProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Checkout fill-in state machine ───────────────────────────────────────
  if (isCheckoutFillInTurn(cart.length, trimmed)) {
    return handleCheckoutFillIn({
      text: trimmed,
      messages,
      cart,
      deliveryCity,
      deliveryDate,
      mcpClient,
      controller,
      language,
    });
  }

  // ── Search fast-paths (popular, repair, gift, budget, breadth) ───────────
  if (
    await tryHandleSearchFastPath({
      text: trimmed,
      messages,
      cart,
      deliveryCity,
      deliveryDate,
      language,
      mcpClient,
      controller,
      budget,
      occasion,
      recipient,
    })
  ) {
    return true;
  }

  // Everything else → LLM handles it
  return false;
}
