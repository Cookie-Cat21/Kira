import { callMcpTool, getMcpClient } from "@/lib/mcp-client";
import {
  extractProductDetailsFromMcp,
  formatMcpContentForModel,
} from "@/lib/mcp-parsing";
import type { CartItem, DeliveryQuote, KiraProduct, TrackingItem } from "@/types";

export const SERVER_CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

// When a query maps to a specific category, keep only products whose name OR
// category contains at least one of these terms. Blocks off-category noise like
// kids bags whose names happen to include the search keyword (e.g. "Sofia Flowers").
export const CATEGORY_RELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  roses: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
};

// Products that pass RELEVANCE but are clearly not in the category — reject them.
// "3D Kids Preschool Bag Double Pocket Sofia Flower" passes the flowers filter
// because "Flower" appears in the name, but it's a bag, not a flower.
export const CATEGORY_IRRELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: /\b(bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery)\b/i,
  roses: /\b(bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery)\b/i,
};

export const CATEGORY_QUERY_MAP: Record<string, string> = {
  cakes: "cake",
  cake: "cake",
  flowers: "flowers",
  flower: "flowers",
  chocolates: "chocolate",
  chocolate: "chocolate",
  electronics: "electronics",
  fashion: "clothing",
  clothing: "clothing",
  hampers: "gift hamper",
  hamper: "gift hamper",
  grocery: "grocery",
  toys: "soft toy",
  home: "home lifestyle",
};

export const BAKERY_BRANDS: Record<string, string> = {
  hilton: "hilton",
  breadtalk: "breadtalk",
  galadari: "galadari",
  "java lounge": "java",
  "shangri-la": "shangri-la",
  shangrila: "shangri-la",
  kingsbury: "kingsbury",
  cinnamon: "cinnamon",
};

export const REORDER_SESSION_RE =
  /\b(order again|buy again|same as last|same thing|what i had|repeat order|reorder)\b/i;
export const REORDER_REF_RE = /\b(?:reorder|order again)\s+(KP[\s-]?\d+)\b/i;
// Matches relationship-repair scenarios in EITHER word order — "wife is mad" and
// "got drunk, wife is upset" both fire. "sorry"/"fix" were dropped: too broad
// ("sorry, my wife needs chocolates" / "fix dinner for my wife" are not repairs).
export const REPAIR_RELATION = "wife|husband|gf|girlfriend|boyfriend|partner|spouse";
export const REPAIR_EMOTION = "angry|mad|pissed|furious|messed up|drunk|fight|fighting|upset";
export const REPAIR_GIFT_RE = new RegExp(
  `(?:\\b(?:${REPAIR_RELATION})\\b.{0,60}\\b(?:${REPAIR_EMOTION})\\b)|` +
    `(?:\\b(?:${REPAIR_EMOTION})\\b.{0,60}\\b(?:${REPAIR_RELATION})\\b)`,
  "i"
);
export const REPAIR_INSIST_RE = /\b(just send|deliver it|send it anyway|no just send)\b/i;
export const RUSH_RE = /\b(today|urgent|asap|rush|same.?day|right now|need it now)\b/i;
export const SALE_RE = /\b(on sale|discount|deal|offer|clearance|budget pick)\b/i;
export const HAMPER_RE = /\b(hamper|gift set|combo pack|gift box|gift basket)\b/i;
export const GLOBAL_SHOP_RE = /\b(amazon|ebay|global shop|imported from)\b/i;

// Common misspellings corrected before hitting MCP search.
export const SEARCH_SPELLING_MAP: Record<string, string> = {
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
// Scan recent user messages to find what was last searched (query + budget).
// Used by the re-show deterministic handler when the user says "show me" / "can i see them".
export function extractLastSearchContext(
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
    if (/\bshow me\s+([a-z]+)/i.test(msg.content)) {
      const showMatch = msg.content.match(/\bshow me\s+([a-z]+)/i);
      const word = showMatch?.[1]?.toLowerCase();
      if (word && word.length >= 3) {
        return { query: normalizeProductQuery(word), maxPrice };
      }
    }
    if (/\bcake\b/.test(msgLow)) { query = "cake"; break; }
    if (/\bflower/.test(msgLow)) { query = "flowers"; break; }
    if (/\bchocolat/.test(msgLow)) { query = "chocolate"; break; }
    if (/\bhamper\b/.test(msgLow)) { query = "gift hamper"; break; }
    if (/\btoy\b/.test(msgLow)) { query = "toy"; break; }
    if (/\bsari|saree|sarree|sare\b/.test(msgLow)) { query = "saree"; break; }
    if (/\bjewel|necklace|bracelet|ring\b/.test(msgLow)) { query = "jewellery"; break; }
    if (/\bperfume|fragrance\b/.test(msgLow)) { query = "perfume"; break; }
    if (/\bfashion|clothing|wear|dress|shirt\b/.test(msgLow)) { query = "clothing"; break; }
    if (/\belectronic|phone|gadget\b/.test(msgLow)) { query = "electronics"; break; }

    // Stop if we at least found a price
    if (maxPrice !== undefined) break;
  }

  return { query, maxPrice };
}

export function dedupeProducts(products: KiraProduct[]): KiraProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = (product.id || product.url || product.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cartItemsToProducts(items: CartItem[]): KiraProduct[] {
  return items.map((item) => item.product);
}

export function extractProductKeyword(lower: string): string | null {
  if (/\bcake\b/.test(lower)) return "cake";
  if (/\bflower|\brose|\bbouquet\b/.test(lower)) return "roses";
  if (/\blilies?\b/.test(lower)) return "flowers";
  if (/\borchids?\b/.test(lower)) return "flowers";
  if (/\bchocolat/.test(lower)) return "chocolate";
  if (/\bhamper\b/.test(lower)) return "gift hamper";
  if (/\b(electronic|smartphone|mobile phone|gadget)\b/.test(lower)) return "electronics";
  if (
    /\bphones?\b/.test(lower) &&
    !/\b(my phone|phone is|phone number|recipient phone|contact number|your phone|mobile is)\b/i.test(
      lower
    )
  ) {
    return "electronics";
  }
  if (/\bfashion|\bcloth|\bdress|\bshirt\b/.test(lower)) return "clothing";
  if (/\bgrocery\b/.test(lower)) return "grocery";
  if (/\btoy\b|\bteddy\b/.test(lower)) return "soft toy";
  if (/\bsweet\b/.test(lower)) return "chocolate";
  if (/\bgift\b/.test(lower)) return "gift set";
  return null;
}

export async function productsFromTrackingItems(
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>,
  items: TrackingItem[]
): Promise<KiraProduct[]> {
  const products: KiraProduct[] = [];
  for (const item of items) {
    if (item.productId) {
      try {
        const result = await callMcpTool(mcpClient, "kapruka_get_product", {
          params: { product_id: item.productId, response_format: "json" },
        });
        const details = extractProductDetailsFromMcp(result.content);
        if (details?.id) {
          products.push({
            id: details.id,
            name: details.name,
            price: details.price,
            currency: details.currency,
            image: details.image,
            summary: details.summary,
            category: details.category,
            url: details.url,
            inStock: details.inStock,
          });
          continue;
        }
      } catch {
        /* fall through to tracking item stub */
      }
    }
    products.push({
      id: item.productId || `tracking-${item.name.replace(/\s+/g, "-").toLowerCase()}`,
      name: item.name,
      price: item.sellingPrice ?? 0,
      currency: "LKR",
    });
  }
  return dedupeProducts(products);
}

export function parseSearchIntent(text: string):
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

export function normalizeProductQuery(raw: string): string {
  const compact = raw
    .replace(/[^a-z0-9\s&]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/i, "") // strip leading articles: "the cake" → "cake"
    .trim();
  return CATEGORY_QUERY_MAP[compact] ?? compact;
}

export function fallbackQuery(query: string): string | undefined {
  if (query === "flowers") return "roses";
  if (query === "cake") return "cakes";
  if (query === "clothing") return "dress";
  if (query === "dress") return "saree";
  if (query === "electronics") return "phone";
  return undefined;
}

export function extractCityHint(text: string): string | undefined {
  const stripped = text.replace(/\bgalle\s+(?:road|rd\.?|mawatha|street|st\.?)\b/gi, " ");
  const cityRe = new RegExp(SERVER_CITY_REGEX.source, "gi");
  const matches = [...stripped.matchAll(cityRe)];
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1][1];
  return last.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractOccasionHint(text: string): string | undefined {
  const match = text.match(
    /\b(birthday|anniversary|wedding|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|new\s+year|get well|congratulations)\b/i
  );
  if (!match) return undefined;
  return match[1].replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractRecipientHint(text: string): string | undefined {
  const match = text.match(
    /\bfor\s+(?:my\s+)?(girlfriend|boyfriend|wife|husband|mum|mom|mother|amma|dad|father|thaththa|friend|sister|brother|daughter|son|boss|colleague|partner)\b/i
  );
  if (!match) return undefined;
  return match[1].replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildReasonBadges(
  product: KiraProduct,
  context: {
    budgetAmount?: number;
    occasion?: string;
    recipient?: string;
    city?: string;
    deliveryDate?: string;
    deliveryInfo?: DeliveryQuote;
  }
): string[] {
  const badges: string[] = [];
  if (context.occasion) badges.push(`${context.occasion} fit`);
  if (context.recipient) badges.push(`For ${context.recipient}`);
  if (context.budgetAmount && product.price <= context.budgetAmount) badges.push("Under budget");
  if (context.deliveryInfo?.perishable) badges.push("Fresh");
  if (context.deliveryInfo?.available && context.city) badges.push(`${context.city} delivery`);
  if (context.deliveryInfo?.available && context.deliveryDate) badges.push("Date ✓");
  if (context.deliveryInfo?.available === false) badges.push("Next available");
  return [...new Set(badges)].slice(0, 4);
}

export function extractFirstCity(content: unknown): string | undefined {
  const parsed = formatMcpContentForModel(content);
  try {
    const data = JSON.parse(parsed) as { cities?: { name?: string }[] };
    return data.cities?.[0]?.name;
  } catch {
    return undefined;
  }
}

export function extractOrderNumber(text: string): string | undefined {
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
