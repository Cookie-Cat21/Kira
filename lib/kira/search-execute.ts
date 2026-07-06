import { parseRelativeDeliveryDate } from "@/lib/colombo-date";
import { callMcpTool } from "@/lib/mcp-client";
import { L, Lf } from "@/lib/kira/localization";
import type { SearchIntentPlan } from "@/lib/kira/search-intent";
import {
  buildReasonBadges,
  buildSearchSuggestions,
  dedupeProducts,
  extractFirstCity,
  extractCityHint,
  fallbackQuery,
  filterProductsForSearch,
  rankProductsForQuery,
} from "@/lib/kira/search";
import { sse, streamWords, TOOL_STEPS } from "@/lib/kira/sse";
import { extractDeliveryInfoFromMcp, extractProductsFromMcp } from "@/lib/mcp-parsing";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { DeliveryQuote, KiraProduct } from "@/types";

const MAX_PARALLEL_LANES = 3;
const FETCH_LIMIT = 15;
const DISPLAY_LIMIT = 6;

export interface ExecuteSearchResult {
  products: KiraProduct[];
  delivery?: DeliveryQuote;
  suggestions: string[];
  honestEmpty: boolean;
  usedHamperPivot: boolean;
}

async function searchLane(
  mcpClient: Client,
  q: string,
  opts: {
    maxPrice?: number;
    sort?: "price_asc" | "price_desc" | "bestseller";
    onStep?: (label: string) => void;
  }
): Promise<KiraProduct[]> {
  opts.onStep?.(`Searching Kapruka for "${q}"`);
  const sorts = opts.sort
    ? [opts.sort]
    : (["bestseller", "price_asc", "price_desc"] as const);
  for (const sort of sorts) {
    const result = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q,
        limit: FETCH_LIMIT,
        in_stock_only: true,
        sort,
        ...(opts.maxPrice ? { max_price: opts.maxPrice } : {}),
        response_format: "json",
      },
    });
    const batch = extractProductsFromMcp(result.content, FETCH_LIMIT);
    if (batch.length > 0) return batch;
  }
  return [];
}

export async function executeSearchPlan({
  plan,
  userText,
  filterContext,
  mcpClient,
  controller,
  language,
  deliveryDate,
}: {
  plan: SearchIntentPlan;
  userText: string;
  filterContext: string;
  mcpClient: Client;
  controller: ReadableStreamDefaultController<Uint8Array>;
  language: string;
  deliveryDate?: string;
}): Promise<ExecuteSearchResult> {
  const lanes = plan.lanes.slice(0, MAX_PARALLEL_LANES);
  const onStep = (label: string) => controller.enqueue(sse("step", label));

  const pool: KiraProduct[] = [];
  const seen = new Set<string>();

  for (const lane of lanes) {
    const queries = [lane, fallbackQuery(lane)].filter((q): q is string => Boolean(q));
    const uniqueQueries = [...new Set(queries)];
    for (const q of uniqueQueries) {
      const batch = await searchLane(mcpClient, q, {
        maxPrice: plan.maxPrice,
        sort: plan.sort,
        onStep,
      });
      for (const p of batch) {
        const key = (p.id || p.url || p.name).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(p);
      }
      if (pool.length >= FETCH_LIMIT) break;
    }
    if (pool.length >= FETCH_LIMIT) break;
  }

  // Retry without max_price if budget filter emptied results
  if (pool.length === 0 && plan.maxPrice) {
    for (const lane of lanes.slice(0, 2)) {
      const batch = await searchLane(mcpClient, lane, { sort: "price_asc", onStep });
      for (const p of batch) {
        const key = (p.id || p.url || p.name).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(p);
      }
    }
  }

  const filterKey = plan.filterKey ?? lanes[0] ?? "";
  let filtered: KiraProduct[];
  // Vague gift runs multiple lanes — union per-lane filters instead of first lane only.
  if (plan.introContext?.vagueGift && lanes.length > 1) {
    const merged = new Map<string, KiraProduct>();
    for (const lane of lanes) {
      for (const p of filterProductsForSearch(pool, lane, userText, filterContext)) {
        const idKey = (p.id || p.url || p.name).toLowerCase();
        if (!merged.has(idKey)) merged.set(idKey, p);
      }
    }
    filtered = [...merged.values()];
  } else {
    filtered = filterProductsForSearch(pool, filterKey, userText, filterContext);
  }
  filtered = rankProductsForQuery(filtered, filterKey, plan.maxPrice);
  let usedHamperPivot = false;

  // Grocery honest pivot — only hampers exist in catalog
  if (
    filtered.length === 0 &&
    plan.groceryHonestPivot &&
    pool.length === 0
  ) {
    onStep('Searching Kapruka for "grocery hamper"');
    const hamperBatch = await searchLane(mcpClient, "grocery hamper", {
      maxPrice: plan.maxPrice,
      sort: plan.sort,
      onStep,
    });
    filtered = filterProductsForSearch(hamperBatch, "hampers", userText, filterContext);
    filtered = rankProductsForQuery(filtered, "grocery hamper", plan.maxPrice);
    usedHamperPivot = filtered.length > 0;
  }

  const products = dedupeProducts(filtered).slice(0, DISPLAY_LIMIT);

  const cityHint = plan.city ?? extractCityHint(userText);
  const effectiveDate = deliveryDate ?? parseRelativeDeliveryDate(userText);
  let delivery: DeliveryQuote | undefined;

  if (cityHint && products[0]) {
    onStep(TOOL_STEPS.kapruka_list_delivery_cities);
    const cityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
      params: { query: cityHint, limit: 3, response_format: "json" },
    });
    const canonicalCity = extractFirstCity(cityResult.content) ?? cityHint;
    onStep(TOOL_STEPS.kapruka_check_delivery);
    const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
      params: {
        city: canonicalCity,
        product_id: products[0].id,
        ...(effectiveDate ? { delivery_date: effectiveDate } : {}),
        response_format: "json",
      },
    });
    delivery = extractDeliveryInfoFromMcp(deliveryResult.content);
    if (delivery) controller.enqueue(sse("delivery", delivery));
  }

  const badgeCtx = {
    budgetAmount: plan.maxPrice,
    occasion: plan.introContext?.occasion,
    recipient: plan.introContext?.recipient,
    city: cityHint,
    deliveryDate: effectiveDate,
    deliveryInfo: delivery,
  };
  for (const p of products) {
    p.badges = buildReasonBadges(p, badgeCtx);
    if (delivery) p.deliveryInfo = delivery;
  }

  const suggestions = buildSearchSuggestions(products, {
    query: filterKey,
    maxPrice: plan.maxPrice,
    city: cityHint,
    selfShop: plan.selfShop,
    groceryHonestPivot: plan.groceryHonestPivot || usedHamperPivot,
  });

  return {
    products,
    delivery,
    suggestions,
    honestEmpty: products.length === 0,
    usedHamperPivot,
  };
}

export async function streamSearchPlanResult({
  plan,
  userText,
  filterContext,
  mcpClient,
  controller,
  language,
  deliveryDate,
}: {
  plan: SearchIntentPlan;
  userText: string;
  filterContext: string;
  mcpClient: Client;
  controller: ReadableStreamDefaultController<Uint8Array>;
  language: string;
  deliveryDate?: string;
}): Promise<void> {
  const result = await executeSearchPlan({
    plan,
    userText,
    filterContext,
    mcpClient,
    controller,
    language,
    deliveryDate,
  });

  const budgetText = plan.maxPrice
    ? ` under LKR ${plan.maxPrice.toLocaleString("en-LK")}`
    : "";
  const cityText = (plan.city ?? extractCityHint(userText))
    ? ` to ${plan.city ?? extractCityHint(userText)}`
    : "";
  const dateText =
    deliveryDate ?? parseRelativeDeliveryDate(userText)
      ? ` on ${deliveryDate ?? parseRelativeDeliveryDate(userText)}`
      : "";

  if (result.honestEmpty) {
    const queryLabel = plan.lanes.join(" / ");
    await streamWords(
      controller,
      Lf("searchNothingFound", language, { query: queryLabel })
    );
  } else if (result.usedHamperPivot) {
    await streamWords(controller, L("groceryHamperPivot", language));
    const introKey = result.products.length === 1 ? "searchFoundOne" : "searchFoundMany";
    await streamWords(
      controller,
      Lf(introKey, language, {
        n: result.products.length,
        budget: budgetText,
        city: cityText,
        date: dateText,
      })
    );
  } else if (plan.introContext?.vagueGift) {
    const recipient = plan.introContext.recipient;
    const intro = recipient
      ? `Nice — here are a few thoughtful picks for ${recipient}${budgetText}${cityText}:`
      : `Here are some live picks${budgetText}${cityText}:`;
    await streamWords(controller, intro);
  } else {
    const introKey = result.products.length === 1 ? "searchFoundOne" : "searchFoundMany";
    await streamWords(
      controller,
      Lf(introKey, language, {
        n: result.products.length,
        budget: budgetText,
        city: cityText,
        date: dateText,
      })
    );
  }

  if (result.products.length > 0) {
    controller.enqueue(sse("products", result.products));
    controller.enqueue(sse("suggestions", result.suggestions));
  }
  controller.enqueue(sse("done"));
}
