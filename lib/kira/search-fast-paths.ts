import { parseRelativeDeliveryDate, getColomboTodayIso } from "@/lib/colombo-date";
import { callMcpTool } from "@/lib/mcp-client";
import { parseBudgetAmount } from "@/lib/kira/catalog-guard";
import { L, Lf } from "@/lib/kira/localization";
import { normalizeUserTypos } from "@/lib/kira/out-of-scope";
import {
  BAKERY_BRANDS,
  GLOBAL_SHOP_RE,
  HAMPER_RE,
  REPAIR_GIFT_RE,
  RUSH_RE,
  SALE_RE,
  buildReasonBadges,
  dedupeProducts,
  extractCityHint,
  extractFirstCity,
  extractOccasionHint,
  extractProductKeyword,
  extractRecipientHint,
  fallbackQuery,
  filterProductsForSearch,
  filterFamilySafeProducts,
  extractLastSearchContext,
  buildMessageFilterContext,
  hasFlowerSearchIntent,
  hasCakeSearchIntent,
  hasChocolateSearchIntent,
  parseSearchIntent,
  parseStorefrontIntent,
  VAGUE_SEARCH_QUERY_RE,
} from "@/lib/kira/search";
import { sse, streamWords, TOOL_STEPS } from "@/lib/kira/sse";
import {
  extractDeliveryInfoFromMcp,
  extractProductsFromMcp,
} from "@/lib/mcp-parsing";
import type { CartItem, DeliveryQuote, KiraProduct } from "@/types";
import type { getMcpClient } from "@/lib/mcp-client";

export async function tryHandleSearchFastPath({
  text,
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
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  language: string;
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  budget?: string;
  occasion?: string;
  recipient?: string;
}): Promise<boolean> {
  const trimmed = normalizeUserTypos(text.trim());
  const lower = trimmed.toLowerCase();
  const filterContext = buildMessageFilterContext(trimmed, messages);

  // ── Global Shop (coming soon) ────────────────────────────────────────────
  if (GLOBAL_SHOP_RE.test(lower)) {
    await streamWords(controller, L("globalShopSoon", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Storefront /shop/{slug} — search immediately, no clarifying questions ─
  const storefrontIntent = parseStorefrontIntent(trimmed);
  if (storefrontIntent) {
    const { slug, query, maxPrice } = storefrontIntent;
    const productCity = extractCityHint(trimmed) ?? deliveryCity;
    const productDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const wantsBest = /\bbest\b/i.test(lower);
    const categoryLabel =
      slug === "hampers"
        ? "gift hampers"
        : slug === "cakes"
          ? "birthday cakes"
          : slug === "flowers"
            ? "flower bouquets"
            : slug === "kids"
              ? "soft toys"
              : slug === "home"
                ? "home gifts"
                : slug;

    controller.enqueue(sse("step", `Searching Kapruka for ${query}`));
    let storefrontProducts: KiraProduct[] = [];
    for (const q of [query, fallbackQuery(query)].filter((v): v is string => Boolean(v))) {
      const storefrontResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: {
          q,
          limit: 6,
          in_stock_only: true,
          ...(maxPrice ? { max_price: maxPrice } : {}),
          ...(wantsBest ? { sort: "bestseller" as const } : {}),
          response_format: "json",
        },
      });
      storefrontProducts = dedupeProducts(
        filterProductsForSearch(
          extractProductsFromMcp(storefrontResult.content),
          q,
          filterContext
        )
      );
      if (storefrontProducts.length >= 3) break;
    }

    if (productCity && storefrontProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: productCity,
          product_id: storefrontProducts[0].id,
          ...(productDate ? { delivery_date: productDate } : {}),
          response_format: "json",
        },
      });
      const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
      if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    }

    const budgetText = maxPrice ? ` under LKR ${maxPrice.toLocaleString("en-LK")}` : "";
    const cityText = productCity ? ` to ${productCity}` : "";
    if (storefrontProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: categoryLabel }));
    } else {
      await streamWords(
        controller,
        Lf("storefrontSearchIntro", language, {
          category: categoryLabel,
          budget: budgetText,
          city: cityText,
        })
      );
      controller.enqueue(sse("products", storefrontProducts));
    }
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
      let batch = filterProductsForSearch(
        extractProductsFromMcp(repairResult.content),
        q,
        filterContext
      );
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
  const hasPhone = PHONE_RE.test(trimmed);
  const hasAddress = ADDRESS_RE.test(trimmed);
  const hasOrderCity = !!extractCityHint(trimmed);
  const isPlaceOrderIntent =
    /\b(place an order|want to order|order for|ready to order|deliver to)\b/i.test(lower);

  // Partial checkout — collect missing fields before product search hijacks the turn.
  if (isPlaceOrderIntent && hasPhone && hasOrderCity && !hasAddress) {
    await streamWords(controller, L("checkoutNeedAddress", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (
    /\b(order|deliver)\b/i.test(lower) &&
    extractProductKeyword(lower) &&
    hasAddress &&
    hasOrderCity &&
    !hasPhone
  ) {
    const orderKw = extractProductKeyword(lower)!;
    const orderDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const orderCity = extractCityHint(trimmed) ?? deliveryCity;
    controller.enqueue(sse("step", `Searching Kapruka for "${orderKw}"`));
    const orderResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: orderKw, limit: 6, in_stock_only: true, response_format: "json" },
    });
    const orderProducts = dedupeProducts(
      filterProductsForSearch(extractProductsFromMcp(orderResult.content), orderKw, filterContext)
    );
    if (orderProducts.length > 0) {
      const cityText = orderCity ? ` to ${orderCity}` : "";
      const dateText = orderDate ? ` on ${orderDate}` : "";
      await streamWords(
        controller,
        Lf(orderProducts.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: orderProducts.length,
          budget: "",
          city: cityText,
          date: dateText,
        })
      );
      controller.enqueue(sse("products", orderProducts));
    }
    await streamWords(controller, L("checkoutNeedPhone", language));
    controller.enqueue(sse("done"));
    return true;
  }
  // Only collect partial checkout fields once the tray has items — otherwise
  // "send flowers to 12 Galle Road" gets misread as checkout field collection.
  if (cart.length > 0) {
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
  const hasProductAndCity = !!simpleProductQuery && !!extractCityHint(trimmed);
  const hasProductForRecipient =
    !!simpleProductQuery &&
    /\bfor\s+(?:my\s+)?(amma|mum|mom|dad|thaththa|wife|husband|friend|girlfriend|boyfriend|partner|her|him|daughter|son)\b/i.test(
      lower
    );
  const hasSimpleProductIntent =
    !!simpleProductQuery &&
    !(cart.length > 0 && hasPhone && (hasAddress || hasOrderCity) && /\b(place|order|recipient|deliver|gift message|address)\b/i.test(lower)) &&
    (/\b(show|search|want|need|looking for|send|buy|get|order|deliver)\b/i.test(lower) ||
      hasDeliveryToRecipient ||
      hasProductAndCity ||
      hasProductForRecipient ||
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
    const products = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(searchResult.content),
        simpleProductQuery,
        filterContext
      )
    );
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
  // City alone is not enough — need budget, occasion, or a concrete product type.
  const hasConcreteProduct =
    !!extractProductKeyword(lower) ||
    /\b(flowers?|cakes?|chocolates?|roses?|hamper|teddy|perfume|electronics|bouquet)\b/i.test(lower);
  if (
    (GIFT_INTENT_RE.test(lower) || hasFamilyHint) &&
    (hasBudgetHint || hasOccasionHint || (hasCityHint && hasConcreteProduct))
  ) {
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
    const flowerIntent = hasFlowerSearchIntent(filterContext);
    const cakeIntent = hasCakeSearchIntent(filterContext);
    const chocolateIntent = hasChocolateSearchIntent(filterContext);
    const searchQueries = flowerIntent
      ? ["flowers", "roses"]
      : cakeIntent
        ? ["cake", "birthday cake"]
        : chocolateIntent
          ? ["chocolate", "chocolates"]
          : giftOccasion?.toLowerCase().includes("birthday") && relationshipGift
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
      giftProducts.push(
        ...filterProductsForSearch(
          extractProductsFromMcp(giftResult.content),
          query,
          filterContext
        )
      );
      if (dedupeProducts(giftProducts).length >= 6) break;
    }
    const dedupedGiftProducts = dedupeProducts(giftProducts).slice(0, 6);

    let canonicalGiftCity = giftCityHint;
    if (giftCityHint && dedupedGiftProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
      const giftCityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
        params: { query: giftCityHint, limit: 3, response_format: "json" },
      });
      canonicalGiftCity = extractFirstCity(giftCityResult.content) ?? giftCityHint;
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
    }

    for (const product of dedupedGiftProducts) {
      product.badges = buildReasonBadges(product, {
        budgetAmount: giftMaxPrice,
        occasion: giftOccasion,
        recipient: giftRecipient,
        city: canonicalGiftCity,
        deliveryDate: giftDate,
        deliveryInfo: product.deliveryInfo ?? dedupedGiftProducts[0]?.deliveryInfo,
      });
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
    const hamperProducts = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(hamperResult.content),
        "gift hamper",
        filterContext
      )
    );
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
    const saleProducts = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(saleResult.content),
        saleQuery,
        filterContext
      )
    );
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
    const todayIso = getColomboTodayIso();
    controller.enqueue(sse("step", `Searching Kapruka for same-day ${rushQuery}`));
    const rushResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: rushQuery, limit: 6, in_stock_only: true, sort: "price_asc", response_format: "json" },
    });
    let rushProducts = dedupeProducts(
      filterProductsForSearch(extractProductsFromMcp(rushResult.content), rushQuery, filterContext)
    );
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
        rushProducts = rushProducts.slice(1);
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
    const brandProducts = dedupeProducts(
      filterProductsForSearch(
        extractProductsFromMcp(brandResult.content),
        `${brandQuery} cake`,
        filterContext
      )
    );
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
      popularProducts = dedupeProducts(
        filterProductsForSearch(extractProductsFromMcp(r.content), q, filterContext)
      );
      if (popularProducts.length > 0) break;
    }
    if (popularProducts.length === 0) {
      await streamWords(controller, "Nothing jumping out as a bestseller right now — want me to search a specific category?");
    } else {
      await streamWords(controller, `Machang, pulled Kapruka's top sellers — all in stock right now. 🛍️`);
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
        bareProducts = dedupeProducts(
          filterProductsForSearch(extractProductsFromMcp(r.content), bareQuery, filterContext)
        );
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
  let searchQuery = searchIntent.query;
  let contextMaxPrice = searchIntent.maxPrice ?? parseBudgetAmount(budget);
  if (VAGUE_SEARCH_QUERY_RE.test(searchQuery)) {
    const ctx = extractLastSearchContext(messages, trimmed);
    searchQuery = ctx.query;
    contextMaxPrice = contextMaxPrice ?? ctx.maxPrice;
  }

  controller.enqueue(sse("step", `Searching Kapruka for "${searchQuery}"`));
  let products: KiraProduct[] = [];
  const flowerIntent = hasFlowerSearchIntent(filterContext);
  const cakeIntent = hasCakeSearchIntent(filterContext);
  const chocolateIntent = hasChocolateSearchIntent(filterContext);
  const retryQueries = flowerIntent
    ? [searchQuery, fallbackQuery(searchQuery), "roses"].filter((q): q is string => Boolean(q))
    : cakeIntent
      ? [searchQuery, fallbackQuery(searchQuery), "birthday cake"].filter((q): q is string => Boolean(q))
      : chocolateIntent
        ? [searchQuery, "chocolate", "chocolates"].filter((q): q is string => Boolean(q))
        : [searchQuery, fallbackQuery(searchQuery)];

  for (const query of retryQueries) {
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
    let batch = filterProductsForSearch(
      extractProductsFromMcp(searchResult.content),
      query,
      filterContext
    );
    products = dedupeProducts([...products, ...batch]);
    if (products.length >= 3) break;
  }

  if (products.length === 0 && contextMaxPrice) {
    const budgetRetryQueries = flowerIntent
      ? ["flowers", "roses"]
      : cakeIntent
        ? ["cake", "birthday cake"]
        : chocolateIntent
          ? ["chocolate", "chocolates"]
          : [searchQuery, fallbackQuery(searchQuery), "chocolate"].filter(
              (q): q is string => Boolean(q)
            );
    for (const query of budgetRetryQueries) {
      if (!query) continue;
      const retryResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: {
          q: query,
          limit: 12,
          in_stock_only: true,
          sort: "price_asc",
          response_format: "json",
        },
      });
      let batch = filterProductsForSearch(
        extractProductsFromMcp(retryResult.content).filter(
          (p) => p.price > 0 && p.price <= contextMaxPrice!
        ),
        query,
        filterContext
      );
      products = dedupeProducts([...products, ...batch]);
      if (products.length > 0) break;
    }
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
