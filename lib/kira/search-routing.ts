import {
  hasCakeSearchIntent,
  hasChocolateSearchIntent,
  hasFlowerSearchIntent,
  hasHamperSearchIntent,
} from "@/lib/kira/search";

/** Categories Kira can detect from user text without regex whack-a-mole per phrase. */
export type SearchCategory = "flowers" | "cake" | "chocolate" | "hampers";

const CATEGORY_DETECTORS: Record<SearchCategory, (text: string) => boolean> = {
  flowers: hasFlowerSearchIntent,
  cake: hasCakeSearchIntent,
  chocolate: hasChocolateSearchIntent,
  hampers: hasHamperSearchIntent,
};

/** Conjunctions that often join two product types the user wants together. */
const COMBO_SPLIT_RE = /\b(?:and|with|plus|&|,\s*)\b/i;

/**
 * Return distinct product categories mentioned in the message.
 * Used for routing (LLM vs fast-path) and carousel relevance validation.
 */
export function detectSearchCategories(text: string): SearchCategory[] {
  const found: SearchCategory[] = [];
  for (const [cat, detect] of Object.entries(CATEGORY_DETECTORS) as [
    SearchCategory,
    (t: string) => boolean,
  ][]) {
    if (detect(text)) found.push(cat);
  }
  return found;
}

/** True when two sides of a conjunction each mention a different category. */
function hasCrossCategoryConjunction(text: string): boolean {
  if (!COMBO_SPLIT_RE.test(text)) return false;
  const parts = text.split(COMBO_SPLIT_RE).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const partCats = parts.map((p) => detectSearchCategories(p)).filter((c) => c.length > 0);
  if (partCats.length < 2) return false;
  const all = new Set(partCats.flat());
  return all.size >= 2;
}

/** MCP `q` values per category for multi-search merges. */
export const CATEGORY_SEARCH_QUERY: Record<SearchCategory, string> = {
  flowers: "flowers",
  chocolate: "chocolate",
  cake: "cake",
  hampers: "gift hamper",
};

/** User wants to see/buy products — not just chatting about categories. */
export function hasProductSearchIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(show\s+me|show\s+us|search|send|need|want|looking\s+for|browse|get\s+me|find|order|deliver|pick|gift\s+for)\b/i.test(
      lower
    ) ||
    lower.includes("on kapruka") ||
    lower.includes("kapruka")
  );
}

/** Two or more categories with explicit product intent → dedicated multi-search handler. */
export function isMultiCategoryProductSearch(text: string): boolean {
  return detectSearchCategories(text).length >= 2 && hasProductSearchIntent(text);
}

/**
 * Legacy name — multi-category with product intent uses the multi-search handler;
 * ambiguous combos (e.g. "flowers or chocolates?") still fall through to the LLM.
 */
export function shouldBypassSearchFastPath(text: string): boolean {
  if (!isMultiCategoryProductSearch(text)) return false;
  // Handled by tryHandleMultiCategorySearch — block single-keyword fast-path only.
  return true;
}
