/**
 * search-relevance.mjs — Carousel category relevance checks for Group S edge suite.
 * Mirrors lib/kira/search-routing.ts + filter rules (keep in sync on category intents).
 */

const FLOWER_RE =
  /\b(flowers?|roses?|bouquets?|floral|lilies?|orchids?|arrangements?|mixed\s+flower)\b/i;
const CHOCOLATE_RE =
  /\b(chocolates?|choc\b|sweet\s*box|truffle|praline|fudge|brownie)\b/i;
const CAKE_RE =
  /\b(cakes?|birthday\s+cake|cupcakes?|pastry|bakery|bday\s+cake)\b/i;
const HAMPER_RE =
  /\b(hampers?|gift\s*hamper|gift\s*set|combo\s*pack|gift\s*box|gift\s*basket)\b/i;

const FLOWER_REL =
  /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i;
const CHOCOLATE_REL =
  /chocolate|choco|cocoa|truffle|praline|fudge|brownie|munchee|cadbury|ferrero|kitkat|snickers|mars\b|biscuit|sweet/i;
const CAKE_REL =
  /cake|cupcake|pastry|cheesecake|mousse|gateau|torte|sponge|brownie|bakery|patisserie/i;
const HAMPER_REL =
  /hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|munch\s*box|pantry|celebration\s*box|festive|joyful|family\s*pack|classic\s*craving|luxury\s*pantry|cravings|treats\s*hamper|grocery\s*hamper|supermarket\s*hamper/i;

const FLOWER_JUNK =
  /\b(greeting\s*card|key\s*tag|keytag|key\s*chain|crochet|everbloom|mini\s*flora|flora\s*bunch|artificial|journal|pen\s*set|pen\s*gift|executive\s*pen)\b/i;
const CHOCOLATE_JUNK =
  /\b(candle|candles|lip\s*balm|body\s*butter|lotion|soap|hand\s*wash|dog|pet\s*treat|mug|poster|t-?shirt|pillow)\b/i;
const CAKE_JUNK =
  /\b(cake\s*topper|topper|birthday\s*candle|number\s*candle|sparkler|party\s*horn|balloon|cake\s*stand|greeting\s*card)\b/i;

export function detectSearchCategories(text) {
  const cats = [];
  if (FLOWER_RE.test(text)) cats.push("flowers");
  if (CAKE_RE.test(text)) cats.push("cake");
  if (CHOCOLATE_RE.test(text)) cats.push("chocolate");
  if (HAMPER_RE.test(text)) cats.push("hampers");
  return cats;
}

function productText(p) {
  return `${p.name ?? ""} ${p.category ?? ""} ${p.summary ?? ""}`;
}

function matchesCategory(key, txt, activeCats) {
  const rel =
    key === "flowers"
      ? FLOWER_REL
      : key === "chocolate"
        ? CHOCOLATE_REL
        : key === "cake"
          ? CAKE_REL
          : key === "hampers"
            ? HAMPER_REL
            : null;
  const irrel =
    key === "flowers"
      ? FLOWER_JUNK
      : key === "chocolate"
        ? CHOCOLATE_JUNK
        : key === "cake"
          ? CAKE_JUNK
          : null;
  if (!rel) return false;
  if (!rel.test(txt)) return false;
  if (irrel?.test(txt)) return false;
  // Flower-themed cakes are not fresh flowers unless user asked for cake too
  if (key === "flowers" && !activeCats.includes("cake") && CAKE_REL.test(txt)) return false;
  return true;
}

/**
 * @returns {{ pass: boolean, violations: string[] }}
 */
export function validateSearchRelevance(userMessage, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { pass: true, violations: [] };
  }

  const activeCats = detectSearchCategories(userMessage);
  if (activeCats.length === 0) {
    return { pass: true, violations: [] };
  }

  const violations = [];
  for (const p of products) {
    const txt = productText(p);
    const name = p.name ?? "(unnamed)";

    if (activeCats.length >= 2) {
      const ok = activeCats.some((cat) => matchesCategory(cat, txt, activeCats));
      if (!ok) violations.push(`${name} — matches none of [${activeCats.join(", ")}]`);
      continue;
    }

    const key = activeCats[0];
    if (!matchesCategory(key, txt, activeCats)) {
      violations.push(`${name} — off-category for ${key}`);
    }
  }

  return { pass: violations.length === 0, violations };
}
