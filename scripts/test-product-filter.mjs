#!/usr/bin/env node
/**
 * Unit tests for flower/bouquet product relevance filtering.
 * Run: node scripts/test-product-filter.mjs
 */
import { FLOWER_JUNK_RE, FLOWER_INTENT_RE } from "./lib/flower-filter.mjs";

const CATEGORY_RELEVANCE_TERMS = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  roses: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
};

const CATEGORY_IRRELEVANCE_TERMS = {
  flowers: FLOWER_JUNK_RE,
  roses: FLOWER_JUNK_RE,
};

function resolveProductFilterKey(query, ...contextTexts) {
  const q = query.toLowerCase().trim();
  const context = [q, ...contextTexts.filter(Boolean)].join(" ");
  if (FLOWER_INTENT_RE.test(context)) return "flowers";
  if (q in CATEGORY_RELEVANCE_TERMS) return q;
  return null;
}

function filterProductsForSearch(products, query, ...contextTexts) {
  const key = resolveProductFilterKey(query, ...contextTexts);
  if (!key) return products;
  const rel = CATEGORY_RELEVANCE_TERMS[key];
  const irrel = CATEGORY_IRRELEVANCE_TERMS[key];
  if (!rel) return products;
  return products.filter((p) => {
    const txt = `${p.name} ${p.category ?? ""} ${p.summary ?? ""}`;
    return rel.test(txt) && !(irrel?.test(txt));
  });
}

const junkSamples = [
  { id: "1", name: "Everbloom Mini Flora Bunch", price: 1410, currency: "LKR" },
  { id: "2", name: "Red Bouquet Handcrafted Greeting Card", price: 330, currency: "LKR" },
  { id: "3", name: "Cute Crochet Rose Bouquet Key Tag", price: 380, currency: "LKR" },
  { id: "4", name: "Pretty Pink Mini Bday Greeting Card", price: 80, currency: "LKR" },
  { id: "5", name: "3D Kids Preschool Bag Double Pocket Sofia Flower", price: 2500, currency: "LKR" },
  { id: "6", name: "Executive Journal Pen Gift Set", price: 7500, currency: "LKR" },
  { id: "7", name: "Classic Essential Belt and Perfume Gift Set", price: 9500, currency: "LKR" },
];

const goodSamples = [
  { id: "10", name: "Red Rose Bouquet (12)", price: 5500, currency: "LKR", category: "Flowers" },
  { id: "11", name: "Mixed Seasonal Flower Arrangement", price: 4800, currency: "LKR", category: "Flowers" },
  { id: "12", name: "Classic Roses Delivery Colombo", price: 4200, currency: "LKR", category: "Roses" },
  { id: "13", name: "Queen Of My World Gift Set", price: 12360, currency: "LKR", category: "Flowers" },
];

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.log(`✗ ${msg}`);
  }
}

for (const name of [
  "Everbloom Mini Flora Bunch",
  "Red Bouquet Handcrafted Greeting Card",
  "Cute Crochet Rose Bouquet Key Tag",
  "Executive Journal Pen Gift Set",
]) {
  assert(FLOWER_JUNK_RE.test(name), `FLOWER_JUNK_RE catches: ${name}`);
}

assert(resolveProductFilterKey("bouquets") === "flowers", "bouquets → flowers filter key");
assert(resolveProductFilterKey("options", "mixed flower bouquets under 3000") === "flowers", "vague q + flower context → flowers");
assert(resolveProductFilterKey("gift", "anniversary flower bouquet") === "flowers", "gift q + flower context → flowers");

const filteredJunk = filterProductsForSearch(junkSamples, "bouquets");
assert(filteredJunk.length === 0, "bouquets query filters out all junk samples");

const filteredGood = filterProductsForSearch(goodSamples, "bouquets");
assert(filteredGood.length === goodSamples.length, "bouquets query keeps real flower products");

const filteredGiftNoise = filterProductsForSearch(
  [...junkSamples, ...goodSamples],
  "gift",
  "mixed flower bouquets under 3000 for anniversary"
);
assert(
  filteredGiftNoise.every((p) => !junkSamples.find((j) => j.id === p.id)),
  "gift q with flower conversation context drops junk"
);
assert(filteredGiftNoise.some((p) => p.id === "13"), "combo flower gift sets still allowed");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
