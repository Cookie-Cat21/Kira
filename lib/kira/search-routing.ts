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

/**
 * Multi-category and combo queries should reach the LLM agent loop so it can
 * run targeted searches (or hampers) instead of a single fast-path keyword search.
 *
 * Keep fast-paths for: tracking, checkout, jailbreak, reorder, popular, single
 * clear category, bare "birthday cake under 2000", storefront slug-only browse.
 */
export function shouldBypassSearchFastPath(text: string): boolean {
  const categories = detectSearchCategories(text);
  if (categories.length >= 2) return true;
  if (hasCrossCategoryConjunction(text)) return true;

  // "flowers or chocolates" — user is deciding; LLM can clarify or show both lanes
  if (/\bor\b/i.test(text) && categories.length === 1) {
    const parts = text.split(/\bor\b/i);
    const altCats = parts
      .map((p) => detectSearchCategories(p))
      .flat()
      .filter((c, i, arr) => arr.indexOf(c) === i);
    if (altCats.length >= 2) return true;
  }

  return false;
}
