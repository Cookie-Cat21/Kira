import { callMcpTool, getMcpClient } from "@/lib/mcp-client";
import {
  extractProductDetailsFromMcp,
  extractProductsFromMcp,
  formatMcpContentForModel,
} from "@/lib/mcp-parsing";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CartItem, DeliveryQuote, KiraProduct, TrackingItem } from "@/types";

export const SERVER_CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

/** User or MCP text signals a fresh-flower search — filter even when q is "gift" or "options". */
export const FLOWER_INTENT_RE =
  /\b(flowers?|roses?|bouquets?|floral|lilies?|orchids?|arrangements?|mixed\s+flower)\b/i;

/** MCP q values that carry no category — inherit from prior user turns instead. */
export const VAGUE_SEARCH_QUERY_RE =
  /^(options?|gifts?|gift\s+ideas?|items?|stuff|things?|ideas?|picks?|something|more|anniversary|birthday)$/i;

export function hasFlowerSearchIntent(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => t && FLOWER_INTENT_RE.test(t.toLowerCase()));
}

export const CHOCOLATE_INTENT_RE =
  /\b(chocolates?|choc\b|sweet\s*box|truffle|praline|fudge|brownie)\b/i;
export const CAKE_INTENT_RE =
  /\b(cakes?|birthday\s+cake|cupcakes?|pastry|bakery|bday\s+cake)\b/i;

export function hasChocolateSearchIntent(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => t && CHOCOLATE_INTENT_RE.test(t.toLowerCase()));
}

export function hasCakeSearchIntent(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => t && CAKE_INTENT_RE.test(t.toLowerCase()));
}

export const HAMPER_INTENT_RE =
  /\b(hampers?|gift\s*hamper|gift\s*set|combo\s*pack|gift\s*box|gift\s*basket)\b/i;

export function hasHamperSearchIntent(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => t && HAMPER_INTENT_RE.test(t.toLowerCase()));
}

export function buildSearchFilterContext(...texts: (string | undefined)[]): string {
  return texts.filter(Boolean).join(" ");
}

export function buildMessageFilterContext(
  currentText: string,
  messages?: { role: string; content: string }[]
): string {
  const recentUser = (messages ?? [])
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content);
  return buildSearchFilterContext(currentText, ...recentUser);
}
// When a query maps to a specific category, keep only products whose name OR
// category contains at least one of these terms. Blocks off-category noise like
// kids bags whose names happen to include the search keyword (e.g. "Sofia Flowers").
export const CATEGORY_RELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  roses: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  chocolate:
    /chocolate|choco|cocoa|truffle|praline|fudge|brownie|munchee|cadbury|ferrero|toffee|nestle|kitkat|snickers|mars\b|biscuit|sweet/i,
  cake: /cake|cupcake|pastry|cheesecake|mousse|gateau|torte|sponge|brownie|bakery|patisserie/i,
  hampers:
    /hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|hamper\s*box|curated|munch\s*box|pantry|celebration\s*box|festive|joyful|family\s*pack|classic\s*craving|luxury\s*pantry|cravings|treats\s*hamper|grocery\s*hamper|supermarket\s*hamper/i,
};

/** Single grocery items / brand pages — not curated hampers. Test name+summary only (not category). */
export const HAMPER_JUNK_RE =
  /\b(body\s*soap|bar\s*soap|cleanser|king\s*coconut|thambili|\bcoconut\b|lifebuoy|pvt\s*ltd|shop all products from|\/partner\/|brand\s*:\s*kapruka|pen\s*set|pen\s*gift|executive\s*pen|journal|stationery)\b/i;

/** Standalone biscuit SKUs miscategorized because the category slug says "hamper". */
export const HAMPER_STANDALONE_JUNK_RE = /\bconfectionery and biscuits\b/i;

/** Real hampers always say so in the product title — not just the category badge. */
export const HAMPER_NAME_RE =
  /\b(hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|pantry|cravings|family\s*pack|munch|celebration|fitness|hygienic|golden\s*crunch|grocery\s*hamper|joyful|classic\s*craving|luxury\s*pantry|nutty)\b/i;

/** Non-edible chocolate-adjacent noise from Kapruka keyword search. */
export const CHOCOLATE_JUNK_RE =
  /\b(candle|candles|lip\s*balm|body\s*butter|lotion|soap|hand\s*wash|body\s*wash|shampoo|air\s*freshener|room\s*spray|dog|pet\s*treat|cat\s*treat|mug|poster|t-?shirt|pillow|duvet|curtain|phone\s*case|key\s*chain)\b/i;

/** Cake toppers/candles/cards — not deliverable cakes. */
export const CAKE_JUNK_RE =
  /\b(cake\s*topper|topper|birthday\s*candle|number\s*candle|sparkler|party\s*horn|balloon|cake\s*stand|serving\s*plate|party\s*hat|bday\s*hat|cutlery\s*set|greeting\s*card|greetingcard|birthday\s*card|mini\s*bday|post\s*card|postcard|wish\s*card|handcrafted\s*(greeting\s*)?card)\b/i;

/** Deliverable fresh flowers — not cards, keychains, artificial decor, or off-category gifts. */
export const FLOWER_JUNK_RE =
  /\b(greeting\s*card|handcrafted\s*(greeting\s*)?card|birthday\s*card|mini\s*bday|post\s*card|postcard|wish\s*card|congratulations\s*card|key\s*tag|keytag|key\s*chain|keychain|key\s*ring|crochet|knitted|yarn|everbloom|artificial|silk\s*flower|fake\s*flower|mini\s*flora|flora\s*bunch|table\s*top|home\s*decor|wall\s*decor|air\s*freshener|potpourri|sticker|magnet|badge|pin\b|bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery|journal|pen\s*set|pen\s*gift|executive\s*pen|desk\s*pen|ballpoint|fountain\s*pen|notebook|diary|perfume|cologne|fragrance|belt|necktie|tie\s*clip|cufflink|jewell?ery|necklace|bracelet|earring|watch|electronic|smartphone|laptop|tablet|speaker|headphone|hand\s*wash|body\s*wash|soap|shampoo|lotion|sanitizer|cleanser)\b/i;

// Products that pass RELEVANCE but are clearly not in the category — reject them.
export const CATEGORY_IRRELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: FLOWER_JUNK_RE,
  roses: FLOWER_JUNK_RE,
  chocolate: CHOCOLATE_JUNK_RE,
  cake: CAKE_JUNK_RE,
  hampers: HAMPER_JUNK_RE,
};

/** Adult / intimate / age-restricted — never surface in Kira carousels. */
export const FAMILY_UNSAFE_RE =
  /\b(condom|condoms|contraceptive|contraception|lubricant|lubrication|personal\s*lubric|sex\s*toy|adult\s*toy|vibrat|dildo|lingerie|intimate\s*wear|bondage|fetish|erotic|sensual\s*massage|libido|viagra|cialis|sperm|semen|pregnancy\s*test|ovulation|fertility\s*kit|plan\s*b|cigarette|cigarettes|tobacco|nicotine|vape|vaping|e-?cig|shisha|hookah|whisky|whiskey|brandy|vodka|gin\b|rum\b|wine\b(?!\s*opener)|beer\b|lager|stout|champagne|liquor|alcohol|arrack)\b/i;

export function productDisplayText(p: KiraProduct): string {
  return `${p.name ?? ""} ${p.category ?? ""} ${p.summary ?? ""}`;
}

export function isFamilySafeProduct(p: KiraProduct): boolean {
  const name = p.name ?? "";
  if (/\bwine\s*opener\b/i.test(name)) return true;
  return !FAMILY_UNSAFE_RE.test(productDisplayText(p));
}

/** Strip adult/intimate catalog items from any carousel — always run before showing products. */
export function filterFamilySafeProducts(products: KiraProduct[]): KiraProduct[] {
  return products.filter(isFamilySafeProduct);
}

export const CATEGORY_QUERY_MAP: Record<string, string> = {
  cakes: "cake",
  cake: "cake",
  flowers: "flowers",
  flower: "flowers",
  bouquet: "flowers",
  bouquets: "flowers",
  roses: "roses",
  rose: "roses",
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
  /\b(order again|buy again|same as last|same thing|what i had|repeat order|repeat (?:my |the )?last order|reorder please|reorder)\b/i;
export const REORDER_REF_RE = /\b(?:reorder|order again)\s+(KP[\s-]?\d+)\b/i;
// Matches relationship-repair scenarios in EITHER word order — "wife is mad" and
// "got drunk, wife is upset" both fire. "sorry"/"fix" were dropped: too broad
// ("sorry, my wife needs chocolates" / "fix dinner for my wife" are not repairs).
export const REPAIR_RELATION = "wife|husband|gf|girlfriend|boyfriend|partner|spouse";
export const REPAIR_EMOTION =
  "angry|mad|pissed|furious|messed up|drunk|fight|fighting|upset|broke up|breakup|break up|heartbroken|dumped|silent treatment|forgot|apolog|sorry|owe her|make it up|let her down|let him down|valentine";
export const REPAIR_GIFT_RE = new RegExp(
  `(?:\\b(?:${REPAIR_RELATION})\\b.{0,60}\\b(?:${REPAIR_EMOTION})\\b)|` +
    `(?:\\b(?:${REPAIR_EMOTION})\\b.{0,60}\\b(?:${REPAIR_RELATION})\\b)|` +
    `(?:\\bbroke up\\b.{0,40}\\b(?:${REPAIR_RELATION}|her|him)\\b)|` +
    `(?:\\b(?:apolog|forgot|owe her|make it up|silent treatment)\\b.{0,50}\\b(?:send|deliver|flowers?|roses?|bouquet|chocolates?|something)\\b)`,
  "i"
);
export const REPAIR_BREAKUP_RE = /\b(broke up|breakup|break up|heartbroken|dumped)\b/i;
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

/** Resolve category filter key from a single text blob (query or merged context). */
function resolveFilterKeyFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  if (hasFlowerSearchIntent(normalized)) return "flowers";
  if (hasHamperSearchIntent(normalized)) return "hampers";
  if (hasCakeSearchIntent(normalized)) return "cake";
  if (hasChocolateSearchIntent(normalized)) return "chocolate";
  const q = normalizeProductQuery(text.toLowerCase().trim());
  if (q in CATEGORY_RELEVANCE_TERMS) return q;
  if (q === "gift hamper" || q === "gift set") return "hampers";
  return null;
}

/** Map MCP search `q` (+ optional conversation context) to a category filter key. */
export function resolveProductFilterKey(
  query: string,
  ...contextTexts: (string | undefined)[]
): string | null {
  const q = normalizeProductQuery(query.toLowerCase().trim());
  const queryKey = resolveFilterKeyFromText(q);
  // Explicit category in the current query wins — don't bleed from prior turns.
  if (queryKey && !VAGUE_SEARCH_QUERY_RE.test(q)) {
    return queryKey;
  }
  const context = buildSearchFilterContext(q, ...contextTexts);
  return resolveFilterKeyFromText(context) ?? queryKey;
}

/** Single entry point before any carousel SSE — category relevance + family-safe. */
export function sanitizeCarouselProducts(
  products: KiraProduct[],
  query = "",
  ...contextTexts: (string | undefined)[]
): KiraProduct[] {
  return filterProductsForSearch(products, query, ...contextTexts);
}

function categoriesFromText(text: string): string[] {
  const cats: string[] = [];
  if (hasFlowerSearchIntent(text)) cats.push("flowers");
  if (hasChocolateSearchIntent(text)) cats.push("chocolate");
  if (hasCakeSearchIntent(text)) cats.push("cake");
  if (hasHamperSearchIntent(text)) cats.push("hampers");
  return cats;
}

function activeSearchCategories(query: string, ...contextTexts: (string | undefined)[]): string[] {
  const q = normalizeProductQuery(query.toLowerCase().trim());
  const queryCats = categoriesFromText(q);
  // Explicit category in the current query wins — don't bleed from prior turns.
  if (queryCats.length > 0 && !VAGUE_SEARCH_QUERY_RE.test(q)) {
    return queryCats;
  }
  const context = buildSearchFilterContext(query, ...contextTexts);
  return categoriesFromText(context);
}

function productMatchesCategoryKey(
  p: KiraProduct,
  key: string,
  activeCats: string[]
): boolean {
  if (key === "hampers") {
    const name = p.name ?? "";
    const body = `${name} ${p.summary ?? ""}`;
    if (!HAMPER_NAME_RE.test(name)) return false;
    if (HAMPER_JUNK_RE.test(body)) return false;
    if (HAMPER_STANDALONE_JUNK_RE.test(body) && !/\bhamper/i.test(name)) return false;
    return true;
  }
  const rel = CATEGORY_RELEVANCE_TERMS[key];
  const irrel = CATEGORY_IRRELEVANCE_TERMS[key];
  if (!rel) return false;
  const txt = productDisplayText(p);
  if (!rel.test(txt) || irrel?.test(txt)) return false;
  // Flower-themed cakes are not fresh bouquets unless the user asked for cake too.
  if (key === "flowers" && !activeCats.includes("cake") && CAKE_INTENT_RE.test(txt)) {
    return false;
  }
  // Decorative ribbon/sculpture cakes must never satisfy a flowers-only lane.
  if (
    key === "flowers" &&
    !activeCats.includes("cake") &&
    /\b(ribbon\s+cake|sculpture\s+cake|flower\s+ribbon\s+cake)\b/i.test(txt)
  ) {
    return false;
  }
  return true;
}

/** Category relevance + family-safe filter for carousel display. */
export function filterProductsForSearch(
  products: KiraProduct[],
  query: string,
  ...contextTexts: (string | undefined)[]
): KiraProduct[] {
  const context = buildSearchFilterContext(query, ...contextTexts);
  const activeCats = activeSearchCategories(query, ...contextTexts);

  // Multi-category combo — product must match at least one requested lane.
  if (activeCats.length >= 2) {
    const result = products.filter((p) =>
      activeCats.some((key) => productMatchesCategoryKey(p, key, activeCats))
    );
    return filterFamilySafeProducts(result);
  }

  const key = resolveProductFilterKey(query, ...contextTexts);
  let result = products;
  if (key && CATEGORY_RELEVANCE_TERMS[key]) {
    result = products.filter((p) => productMatchesCategoryKey(p, key, activeCats));
  }
  return filterFamilySafeProducts(result);
}

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

export function productIds(products: KiraProduct[] | undefined): Set<string> {
  return new Set((products ?? []).map((p) => p.id).filter(Boolean));
}

/** Rotate sorts/queries until we find items not already shown in this chat. */
export async function fetchFreshMoreProducts({
  mcpClient,
  query,
  maxPrice,
  excludeIds,
  onStep,
  filterContext,
}: {
  mcpClient: Client;
  query: string;
  maxPrice?: number;
  excludeIds: Set<string>;
  onStep?: (label: string) => void;
  filterContext?: string;
}): Promise<KiraProduct[]> {
  const sorts = ["price_asc", "price_desc", "bestseller"] as const;
  const queries = [query, fallbackQuery(query)].filter(
    (q): q is string => Boolean(q)
  );
  const uniqueQueries = [...new Set(queries)];
  const freshPool: KiraProduct[] = [];
  const poolIds = new Set<string>();

  for (const q of uniqueQueries) {
    for (const sort of sorts) {
      onStep?.(`Searching Kapruka for "${q}" (${sort})`);
      const moreResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: {
          q,
          limit: 12,
          in_stock_only: true,
          sort,
          ...(maxPrice ? { max_price: maxPrice } : {}),
          response_format: "json",
        },
      });
      const batch = dedupeProducts(
        filterProductsForSearch(
          extractProductsFromMcp(moreResult.content),
          q,
          filterContext ?? query
        )
      );
      for (const product of batch) {
        if (excludeIds.has(product.id) || poolIds.has(product.id)) continue;
        poolIds.add(product.id);
        freshPool.push(product);
        if (freshPool.length >= 6) return freshPool;
      }
    }
  }

  return freshPool;
}

/** Single bestseller search — fallback when rotated "more options" pool is empty. */
export async function fetchBaselineSearchProducts({
  mcpClient,
  query,
  maxPrice,
  onStep,
  filterContext,
}: {
  mcpClient: Client;
  query: string;
  maxPrice?: number;
  onStep?: (label: string) => void;
  filterContext?: string;
}): Promise<KiraProduct[]> {
  onStep?.(`Searching Kapruka for "${query}"`);
  const result = await callMcpTool(mcpClient, "kapruka_search_products", {
    params: {
      q: query,
      limit: 6,
      in_stock_only: true,
      sort: "bestseller",
      ...(maxPrice ? { max_price: maxPrice } : {}),
      response_format: "json",
    },
  });
  return dedupeProducts(
    filterProductsForSearch(
      extractProductsFromMcp(result.content),
      query,
      filterContext ?? query
    )
  );
}

export function cartItemsToProducts(items: CartItem[]): KiraProduct[] {
  return items.map((item) => item.product);
}

export function extractProductKeyword(lower: string): string | null {
  const text = lower
    .replace(/\bflwoers\b/gi, "flowers")
    .replace(/\bbirtday\b/gi, "birthday")
    .replace(/\bcolmbo\b/gi, "colombo")
    .replace(/\btomoro\b/gi, "tomorrow")
    .replace(/\bchoclate\b/gi, "chocolate")
    .replace(/\bbouqet\b/gi, "bouquet");
  if (/\bcake\b/.test(text)) return "cake";
  if (/\bflower|\brose|\bbouquet/.test(text)) return "flowers";
  if (/\blilies?\b/.test(text)) return "flowers";
  if (/\borchids?\b/.test(text)) return "flowers";
  if (/\bchocolat/.test(text)) return "chocolate";
  if (/\bhamper\b/.test(text)) return "gift hamper";
  if (/\b(electronic|smartphone|mobile phone|gadget)\b/.test(text)) return "electronics";
  if (/\bphones?\b/.test(text)) {
    if (
      /\b(my phone|phone is|phone number|recipient phone|contact number|your phone|phone\s*[:=]?\s*(?:\+?94|0)\d)/i.test(
        text
      )
    ) {
      return null;
    }
    return "electronics";
  }
  if (/\bfashion|\bcloth|\bdress|\bshirt\b/.test(text)) return "clothing";
  if (/\bgrocery\b/.test(text)) return "grocery";
  if (/\btoy\b|\bteddy\b/.test(text)) return "soft toy";
  if (/\bsweet\b/.test(text)) return "chocolate";
  if (/\bgift\b/.test(text)) return "gift set";
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

/** Store category slugs from `/shop/{slug}` → Kapruka search query. */
export const STOREFRONT_CATEGORY_SLUGS: Record<string, string> = {
  hampers: "gift hamper",
  flowers: "flowers",
  cakes: "cake",
  chocolates: "chocolate",
  electronics: "electronics",
  grocery: "grocery",
  kids: "soft toy",
  home: "home lifestyle",
};

const SHOP_CONTEXT_RE =
  /\b(shop|storefront|shop page|\/shop\/|shop\/|category|browsing|comparing)\b/i;

const STOREFRONT_SLUG_ALIASES: [RegExp, string][] = [
  [/gift hampers?|\bhampers\b/, "hampers"],
  [/flower bouquets?|\bbouquets?\b|\bflowers?\b/, "flowers"],
  [/birthday cakes?|\bcakes?\b/, "cakes"],
  [/\bchocolates?\b/, "chocolates"],
  [/phone accessories|\belectronics?\b/, "electronics"],
  [/\bgrocery\b/, "grocery"],
  [/soft toys?|\bkids\b/, "kids"],
  [/\bhome\b/, "home"],
];

function slugFromShopText(lower: string): string | null {
  const pathSlug = lower.match(/(?:\/shop\/|shop\/)([a-z]+)/)?.[1];
  if (pathSlug && STOREFRONT_CATEGORY_SLUGS[pathSlug]) return pathSlug;

  const hasShopContext =
    SHOP_CONTEXT_RE.test(lower) ||
    /\b(on your shop page|in the shop|on the storefront)\b/.test(lower);

  if (!hasShopContext) return null;

  for (const [re, slug] of STOREFRONT_SLUG_ALIASES) {
    if (re.test(lower)) return slug;
  }
  return null;
}

/** User was browsing the storefront — search immediately, don't ask clarifying questions. */
export function parseStorefrontIntent(
  text: string
): { slug: string; query: string; maxPrice?: number } | null {
  const lower = text.toLowerCase().trim();
  const slug = slugFromShopText(lower);
  if (!slug) return null;
  const query = STOREFRONT_CATEGORY_SLUGS[slug];
  if (!query) return null;
  const priceMatch = lower.match(/\b(?:under|below|max|budget)\s+(?:lkr\s*)?([\d,]+)/);
  const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
  return { slug, query, maxPrice };
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
    lower.includes("kapruka") ||
    lower.includes("live stock");
  if (!isSearchy) return null;

  const bestMatch = lower.match(/show me (?:the )?best (.+?) on kapruka/);
  if (bestMatch?.[1]) {
    const query = normalizeProductQuery(bestMatch[1].trim());
    if (query.length >= 3) {
      const priceMatch = lower.match(/\b(?:under|below|max|maximum)\s+(?:lkr\s*)?([\d,]+)/);
      return {
        query,
        maxPrice: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
      };
    }
  }

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
