/** Shared product safety patterns — keep in sync with lib/kira/search.ts */
export const FLOWER_JUNK_RE =
  /\b(greeting\s*card|handcrafted\s*(greeting\s*)?card|birthday\s*card|mini\s*bday|post\s*card|postcard|wish\s*card|congratulations\s*card|key\s*tag|keytag|key\s*chain|keychain|key\s*ring|crochet|knitted|yarn|everbloom|artificial|silk\s*flower|fake\s*flower|mini\s*flora|flora\s*bunch|table\s*top|home\s*decor|wall\s*decor|air\s*freshener|potpourri|sticker|magnet|badge|pin\b|bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery|journal|pen\s*set|pen\s*gift|executive\s*pen|desk\s*pen|ballpoint|fountain\s*pen|notebook|diary|perfume|cologne|fragrance|belt|necktie|tie\s*clip|cufflink|jewell?ery|necklace|bracelet|earring|watch|electronic|smartphone|laptop|tablet|speaker|headphone|hand\s*wash|body\s*wash|soap|shampoo|lotion|sanitizer|cleanser)\b/i;

export const CHOCOLATE_JUNK_RE =
  /\b(candle|candles|lip\s*balm|body\s*butter|lotion|soap|hand\s*wash|body\s*wash|shampoo|air\s*freshener|room\s*spray|dog|pet\s*treat|cat\s*treat|mug|poster|t-?shirt|pillow|duvet|curtain|phone\s*case|key\s*chain)\b/i;

export const CAKE_JUNK_RE =
  /\b(cake\s*topper|topper|birthday\s*candle|number\s*candle|sparkler|party\s*horn|balloon|cake\s*stand|serving\s*plate|party\s*hat|bday\s*hat|cutlery\s*set)\b/i;

export const FLOWER_INTENT_RE =
  /\b(flowers?|roses?|bouquets?|floral|lilies?|orchids?|arrangements?|mixed\s+flower)\b/i;

export const CHOCOLATE_INTENT_RE =
  /\b(chocolates?|choc\b|sweet\s*box|truffle|praline|fudge|brownie)\b/i;

export const CAKE_INTENT_RE =
  /\b(cakes?|birthday\s+cake|cupcakes?|pastry|bakery|bday\s+cake)\b/i;

export const FAMILY_UNSAFE_RE =
  /\b(condom|condoms|contraceptive|contraception|lubricant|lubrication|personal\s*lubric|sex\s*toy|adult\s*toy|vibrat|dildo|lingerie|intimate\s*wear|bondage|fetish|erotic|sensual\s*massage|libido|viagra|cialis|sperm|semen|pregnancy\s*test|ovulation|fertility\s*kit|plan\s*b|cigarette|cigarettes|tobacco|nicotine|vape|vaping|e-?cig|shisha|hookah|whisky|whiskey|brandy|vodka|gin\b|rum\b|wine\b|beer\b|lager|stout|champagne|liquor|alcohol|arrack)\b/i;

export function productText(p) {
  return `${p.name ?? ""} ${p.category ?? ""} ${p.summary ?? ""}`;
}

export function hasFlowerJunkProduct(products) {
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.some((p) => FLOWER_JUNK_RE.test(productText(p)));
}

export function hasFamilyUnsafeProduct(products) {
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.some((p) => FAMILY_UNSAFE_RE.test(productText(p)));
}

export function filterFamilySafeProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.filter((p) => !FAMILY_UNSAFE_RE.test(productText(p)));
}
