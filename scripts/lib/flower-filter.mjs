/** Shared flower junk patterns — keep in sync with lib/kira/search.ts FLOWER_JUNK_RE */
export const FLOWER_JUNK_RE =
  /\b(greeting\s*card|handcrafted\s*(greeting\s*)?card|birthday\s*card|mini\s*bday|post\s*card|postcard|wish\s*card|congratulations\s*card|key\s*tag|keytag|key\s*chain|keychain|key\s*ring|crochet|knitted|yarn|everbloom|artificial|silk\s*flower|fake\s*flower|mini\s*flora|flora\s*bunch|table\s*top|home\s*decor|wall\s*decor|air\s*freshener|potpourri|sticker|magnet|badge|pin\b|bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery)\b/i;

export function hasFlowerJunkProduct(products) {
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.some((p) => FLOWER_JUNK_RE.test(`${p.name ?? ""} ${p.category ?? ""}`));
}
