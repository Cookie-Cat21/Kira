#!/usr/bin/env node
/**
 * Unit tests for flower/bouquet product relevance filtering.
 * Run: node scripts/test-product-filter.mjs
 */
import { FLOWER_JUNK_RE } from "./lib/flower-filter.mjs";

const CATEGORY_RELEVANCE_TERMS = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  roses: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
};

const CATEGORY_IRRELEVANCE_TERMS = {
  flowers: FLOWER_JUNK_RE,
  roses: FLOWER_JUNK_RE,
};

function resolveProductFilterKey(query) {
  const q = query.toLowerCase().trim();
  if (
    /\b(flowers?|roses?|bouquets?|floral|lilies?|orchids?|arrangements?)\b/.test(q) ||
    q === "flowers" ||
    q === "roses"
  ) {
    return "flowers";
  }
  if (q in CATEGORY_RELEVANCE_TERMS) return q;
  return null;
}

function filterProductsForSearch(products, query) {
  const key = resolveProductFilterKey(query);
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
];

const goodSamples = [
  { id: "10", name: "Red Rose Bouquet (12)", price: 5500, currency: "LKR", category: "Flowers" },
  { id: "11", name: "Mixed Seasonal Flower Arrangement", price: 4800, currency: "LKR", category: "Flowers" },
  { id: "12", name: "Classic Roses Delivery Colombo", price: 4200, currency: "LKR", category: "Roses" },
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
]) {
  assert(FLOWER_JUNK_RE.test(name), `FLOWER_JUNK_RE catches: ${name}`);
}

assert(resolveProductFilterKey("bouquets") === "flowers", "bouquets → flowers filter key");
assert(resolveProductFilterKey("mixed flower bouquet") === "flowers", "mixed flower bouquet → flowers");
assert(resolveProductFilterKey("roses") === "flowers", "roses → flowers filter key");

const filteredJunk = filterProductsForSearch(junkSamples, "bouquets");
assert(filteredJunk.length === 0, "bouquets query filters out all junk samples");

const filteredGood = filterProductsForSearch(goodSamples, "bouquets");
assert(filteredGood.length === goodSamples.length, "bouquets query keeps real flower products");

const filteredFlowers = filterProductsForSearch([...junkSamples, ...goodSamples], "flowers");
assert(
  filteredFlowers.length === goodSamples.length &&
    filteredFlowers.every((p) => !junkSamples.find((j) => j.id === p.id)),
  "flowers query keeps only deliverable products"
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
