import { parseBudgetAmount } from "@/lib/kira/catalog-guard";
import { normalizeUserTypos } from "@/lib/kira/out-of-scope";
import { isMultiCategoryProductSearch } from "@/lib/kira/search-routing";
import {
  BAKERY_BRANDS,
  GLOBAL_SHOP_RE,
  HAMPER_RE,
  REPAIR_GIFT_RE,
  RUSH_RE,
  SALE_RE,
  extractCityHint,
  extractOccasionHint,
  extractProductKeyword,
  extractRecipientHint,
  parseSearchIntent,
  parseStorefrontIntent,
} from "@/lib/kira/search";

export type SearchSort = "price_asc" | "price_desc" | "bestseller";

export interface SearchIntentPlan {
  action: "search";
  lanes: string[];
  maxPrice?: number;
  city?: string;
  sort?: SearchSort;
  selfShop?: boolean;
  groceryHonestPivot?: boolean;
  filterKey?: string;
  introContext?: {
    recipient?: string;
    occasion?: string;
    vagueGift?: boolean;
  };
}

export interface SearchAskPlan {
  action: "ask";
  askKey: string;
}

export type ResolvedSearchIntent = SearchIntentPlan | SearchAskPlan | null;

const POPULAR_RE = /\b(popular|trending|best\s+sellers?|what(?:'s| is) (?:hot|new))\b/i;
const SELF_SHOP_RE =
  /\b(for myself|for me|shop(?:ping)? for myself|buy(?:ing)? for myself|something for myself|restock|ran out of|not a gift|self shopping|self-shop)\b/i;
const SELF_SHOP_VAGUE_RE =
  /\b(for myself|for me|shop(?:ping)? for myself|buy(?:ing)? for myself|something for myself|restock|ran out of)\b/i;
const VAGUE_GIFT_RE =
  /\b(something|anything|surprise|nice|sweet|lovely|thoughtful|help me pick|don't know what|do not know what|pick something)\b/i;
const CHEAP_RE = /\b(cheap|affordable|budget|economical|low cost|inexpensive)\b/i;
const EGGLESS_RE = /\b(eggless|egg free|egg-free|no egg)\b/i;
const HAMPER_EXPLICIT_RE = /\b(hamper|gift set|combo pack|gift basket)\b/i;

const GROCERY_TERMS_RE = /\b(groceries|grocery|rice|dhal|dal|flour|essentials|soap|cleaning)\b/i;
const ELECTRONICS_TERMS_RE =
  /\b(electronics?|smartphone|mobile phone|phone chargers?|chargers?|gadgets?|phones?\b)/i;

function cheapBudgetFallback(text: string): number | undefined {
  if (CHEAP_RE.test(text)) return 3000;
  const m = text.match(/\b(?:under|below|max|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+)/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    if (n >= 200 && n <= 500_000) return n;
  }
  return undefined;
}

function groceryLanes(text: string): string[] {
  const lower = text.toLowerCase();
  const lanes: string[] = [];
  if (/\brice\b/.test(lower)) lanes.push("rice", "red rice");
  if (/\b(dhal|dal)\b/.test(lower)) lanes.push("dhal", "dal");
  if (/\bflour\b/.test(lower)) lanes.push("flour");
  if (/\bessentials\b/.test(lower)) lanes.push("home essentials");
  if (/\bsoap\b/.test(lower)) lanes.push("soap");
  if (/\bcleaning\b/.test(lower)) lanes.push("cleaning");
  if (lanes.length === 0) lanes.push("rice", "dhal", "grocery essentials");
  return [...new Set(lanes)].slice(0, 3);
}

function vagueGiftLanes(recipient?: string): string[] {
  if (recipient && /\b(amma|mum|mom|mother|dad|father|thaththa)\b/i.test(recipient)) {
    return ["gift hamper", "flowers", "cake"];
  }
  return ["gift set", "flowers", "chocolate"];
}

function egglessCakeLanes(text: string): string[] {
  const lanes = ["eggless cake", "egg free cake"];
  for (const brand of Object.keys(BAKERY_BRANDS)) {
    if (text.toLowerCase().includes(brand)) lanes.push(`${brand} cake`);
  }
  lanes.push("birthday cake");
  return [...new Set(lanes)].slice(0, 3);
}

function shouldDeferToSpecializedHandlers(text: string): boolean {
  const lower = text.toLowerCase();
  if (GLOBAL_SHOP_RE.test(lower)) return true;
  if (REPAIR_GIFT_RE.test(lower)) return true;
  if (isMultiCategoryProductSearch(text)) return true;
  if (RUSH_RE.test(lower)) return true;
  if (SALE_RE.test(lower)) return true;
  if (POPULAR_RE.test(lower)) return true;
  if (parseStorefrontIntent(text)) return true;
  if (HAMPER_RE.test(lower) && !parseSearchIntent(text)) return true;
  for (const brand of Object.keys(BAKERY_BRANDS)) {
    if (lower.includes(brand) && /\bcake\b/.test(lower)) return true;
  }
  return false;
}

export interface ResolveSearchIntentContext {
  budget?: string;
  deliveryCity?: string;
  occasion?: string;
  recipient?: string;
}

/**
 * Unified search intent — returns null when specialized fast-paths should handle the turn.
 */
export function resolveSearchIntent(
  rawText: string,
  ctx: ResolveSearchIntentContext = {}
): ResolvedSearchIntent {
  const text = normalizeUserTypos(rawText.trim());
  const lower = text.toLowerCase();
  if (!text || shouldDeferToSpecializedHandlers(text)) return null;

  const maxPrice =
    parseBudgetAmount(text) ??
    parseBudgetAmount(ctx.budget) ??
    cheapBudgetFallback(text);
  const city = extractCityHint(text) ?? ctx.deliveryCity;
  const recipient = extractRecipientHint(text) ?? ctx.recipient;
  const occasion = extractOccasionHint(text) ?? ctx.occasion;

  // Bare budget only
  if (/^(?:under|below|max(?:imum)?|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+)\s*$/i.test(text)) {
    return { action: "ask", askKey: "budgetOnlyAsk" };
  }

  // Self-shopper
  if (SELF_SHOP_RE.test(lower) || (GROCERY_TERMS_RE.test(lower) && /\b(for myself|for me|deliver)\b/i.test(lower))) {
    let kw = extractProductKeyword(lower);
    if (!kw && GROCERY_TERMS_RE.test(lower)) kw = "grocery";
    if (!kw && ELECTRONICS_TERMS_RE.test(lower)) kw = "electronics";
    if (!kw && /\bhome essentials\b/i.test(lower)) kw = "home essentials";
    if (!kw && /\bphone chargers?\b/i.test(lower)) kw = "phone charger";
    if (kw) {
      const lanes =
        kw === "grocery" || GROCERY_TERMS_RE.test(lower) ? groceryLanes(text) : [kw];
      return {
        action: "search",
        lanes,
        maxPrice,
        city,
        selfShop: true,
        groceryHonestPivot: kw === "grocery" || GROCERY_TERMS_RE.test(lower),
        filterKey: kw === "grocery" ? "grocery" : kw === "electronics" ? "electronics" : undefined,
      };
    }
    if (SELF_SHOP_VAGUE_RE.test(lower)) {
      return { action: "ask", askKey: "selfShopIntro" };
    }
  }

  // parseSearchIntent ("show me X on Kapruka")
  const parsed = parseSearchIntent(text);
  if (parsed) {
    let lanes = [parsed.query];
    if (parsed.query === "grocery") lanes = groceryLanes(text);
    if (EGGLESS_RE.test(lower) && /\bcake\b/.test(lower)) lanes = egglessCakeLanes(text);
    return {
      action: "search",
      lanes,
      maxPrice: parsed.maxPrice ?? maxPrice,
      city,
      sort: parsed.sort,
      filterKey: parsed.query,
    };
  }

  // Eggless cake + city/date
  if (EGGLESS_RE.test(lower) && /\bcake\b/.test(lower)) {
    return {
      action: "search",
      lanes: egglessCakeLanes(text),
      maxPrice,
      city,
      filterKey: "cake",
    };
  }

  // Concrete product keyword with search verbs or city/recipient
  let productKw = extractProductKeyword(lower);
  if (!productKw && /\bcake\b/.test(lower)) productKw = "cake";
  if (!productKw && /\b(home essentials|cleaning)\b/i.test(lower)) productKw = "home essentials";

  const hasSearchVerb =
    /\b(show|search|want|need|looking for|send|buy|get|order|deliver|pick|find|browse)\b/i.test(
      lower
    ) || /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(text);

  const hasGiftContext =
    !!recipient ||
    !!occasion ||
    !!city ||
    /\bfor\s+(?:my\s+)?(amma|mum|mom|wife|husband|her|him|friend|daughter|son)\b/i.test(lower);

  if (productKw && (hasSearchVerb || hasGiftContext || lower === productKw)) {
    const lanes =
      productKw === "grocery" || (GROCERY_TERMS_RE.test(lower) && !HAMPER_EXPLICIT_RE.test(lower))
        ? groceryLanes(text)
        : [productKw];
    return {
      action: "search",
      lanes,
      maxPrice,
      city,
      selfShop: SELF_SHOP_RE.test(lower),
      groceryHonestPivot:
        (productKw === "grocery" || GROCERY_TERMS_RE.test(lower)) && !HAMPER_EXPLICIT_RE.test(lower),
      filterKey:
        productKw === "grocery"
          ? "grocery"
          : productKw === "electronics"
            ? "electronics"
            : productKw === "clothing"
              ? "clothing"
              : undefined,
    };
  }

  // Vague gift with recipient and/or city — search immediately (max one clarifier avoided)
  if (
    VAGUE_GIFT_RE.test(lower) &&
    (recipient || city || maxPrice || CHEAP_RE.test(lower) || hasGiftContext)
  ) {
    return {
      action: "search",
      lanes: vagueGiftLanes(recipient),
      maxPrice,
      city,
      sort: maxPrice ? "price_asc" : "bestseller",
      introContext: { recipient, occasion, vagueGift: true },
    };
  }

  // Electronics with budget even without explicit verb
  if (ELECTRONICS_TERMS_RE.test(lower) && (maxPrice || SELF_SHOP_RE.test(lower))) {
    return {
      action: "search",
      lanes: ["electronics", "phone accessories"],
      maxPrice,
      city,
      selfShop: SELF_SHOP_RE.test(lower),
      filterKey: "electronics",
      sort: maxPrice ? "price_asc" : undefined,
    };
  }

  // Grocery multi-item without self-shop phrasing
  if (GROCERY_TERMS_RE.test(lower) && !HAMPER_EXPLICIT_RE.test(lower) && hasSearchVerb) {
    return {
      action: "search",
      lanes: groceryLanes(text),
      maxPrice,
      city,
      groceryHonestPivot: true,
      filterKey: "grocery",
    };
  }

  return null;
}
