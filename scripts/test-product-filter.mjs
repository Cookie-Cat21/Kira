#!/usr/bin/env node
/**
 * Unit tests for carousel product relevance + family-safe filtering.
 * Run: node scripts/test-product-filter.mjs
 */
import {
  FLOWER_JUNK_RE,
  CHOCOLATE_JUNK_RE,
  CAKE_JUNK_RE,
  FLOWER_INTENT_RE,
  CHOCOLATE_INTENT_RE,
  CAKE_INTENT_RE,
  FAMILY_UNSAFE_RE,
  filterFamilySafeProducts,
} from "./lib/flower-filter.mjs";

const CATEGORY_RELEVANCE_TERMS = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  chocolate:
    /chocolate|choco|cocoa|truffle|praline|fudge|brownie|munchee|cadbury|ferrero|toffee|nestle|kitkat|snickers|mars\b|biscuit|sweet/i,
  cake: /cake|cupcake|pastry|cheesecake|mousse|gateau|torte|sponge|brownie|bakery|patisserie/i,
};

const CATEGORY_IRRELEVANCE_TERMS = {
  flowers: FLOWER_JUNK_RE,
  chocolate: CHOCOLATE_JUNK_RE,
  cake: CAKE_JUNK_RE,
};

function resolveProductFilterKey(query, ...contextTexts) {
  const q = query.toLowerCase().trim();
  const context = [q, ...contextTexts.filter(Boolean)].join(" ");
  if (FLOWER_INTENT_RE.test(context)) return "flowers";
  if (CAKE_INTENT_RE.test(context)) return "cake";
  if (CHOCOLATE_INTENT_RE.test(context)) return "chocolate";
  if (q in CATEGORY_RELEVANCE_TERMS) return q;
  return null;
}

function filterProductsForSearch(products, query, ...contextTexts) {
  const key = resolveProductFilterKey(query, ...contextTexts);
  let result = products;
  if (key) {
    const rel = CATEGORY_RELEVANCE_TERMS[key];
    const irrel = CATEGORY_IRRELEVANCE_TERMS[key];
    if (rel) {
      result = products.filter((p) => {
        const txt = `${p.name ?? ""} ${p.category ?? ""} ${p.summary ?? ""}`;
        return rel.test(txt) && !(irrel?.test(txt));
      });
    }
  }
  return filterFamilySafeProducts(result);
}

const flowerJunk = [
  { id: "1", name: "Everbloom Mini Flora Bunch", price: 1410, currency: "LKR" },
  { id: "2", name: "Red Bouquet Handcrafted Greeting Card", price: 330, currency: "LKR" },
  { id: "3", name: "Cute Crochet Rose Bouquet Key Tag", price: 380, currency: "LKR" },
  { id: "6", name: "Executive Journal Pen Gift Set", price: 7500, currency: "LKR" },
];

const flowerGood = [
  { id: "10", name: "Red Rose Bouquet (12)", price: 5500, currency: "LKR", category: "Flowers" },
  { id: "11", name: "Mixed Seasonal Flower Arrangement", price: 4800, currency: "LKR", category: "Flowers" },
];

const familyUnsafe = [
  { id: "8", name: "ROMEO Chocolate Flavoured Plain Condoms", price: 100, currency: "LKR" },
  { id: "9", name: "Old Arrack 750ml Gift Box", price: 4500, currency: "LKR" },
  { id: "10u", name: "Gold Label Cigarettes Pack", price: 1200, currency: "LKR" },
];

const chocolateGood = [
  { id: "20", name: "K - Super Fruitichoc - Milk Choco With Strawberry", price: 60, currency: "LKR" },
  { id: "22", name: "Munchee Chocolate Cream Biscuits - 100g", price: 130, currency: "LKR" },
];

const chocolateJunk = [
  { id: "21", name: "Yankee Candle Chocolate Layer Cake Scented", price: 3200, currency: "LKR" },
  { id: "23", name: "Palmer's Cocoa Butter Lip Balm", price: 890, currency: "LKR" },
];

const cakeGood = [
  { id: "30", name: "Chocolate Fudge Birthday Cake 2lb", price: 4500, currency: "LKR", category: "Cakes" },
  { id: "31", name: "Hilton Chocolate Mousse Cake", price: 6200, currency: "LKR", category: "Cakes" },
];

const cakeJunk = [
  { id: "32", name: "Gold Number 5 Birthday Candle", price: 250, currency: "LKR" },
  { id: "33", name: "Happy Birthday Cake Topper Set", price: 450, currency: "LKR" },
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

assert(FAMILY_UNSAFE_RE.test("ROMEO Chocolate Flavoured Plain Condoms"), "blocks condoms");
assert(FAMILY_UNSAFE_RE.test("Old Arrack 750ml Gift Box"), "blocks arrack");
assert(FAMILY_UNSAFE_RE.test("Gold Label Cigarettes Pack"), "blocks cigarettes");

assert(
  filterProductsForSearch([...familyUnsafe, ...chocolateGood], "chocolate").every(
    (p) => !familyUnsafe.find((u) => u.id === p.id)
  ),
  "family-unsafe stripped from chocolate search"
);

assert(
  filterProductsForSearch(flowerJunk, "bouquets").length === 0,
  "bouquets filters flower junk"
);

assert(
  filterProductsForSearch(flowerGood, "bouquets").length === flowerGood.length,
  "bouquets keeps real flowers"
);

assert(
  filterProductsForSearch(
    [...flowerJunk, ...flowerGood],
    "gift",
    "mixed flower bouquets under 3000 for anniversary"
  ).every((p) => !flowerJunk.find((j) => j.id === p.id)),
  "gift q + flower context drops junk"
);

assert(
  filterProductsForSearch([...chocolateJunk, ...chocolateGood], "chocolate").length ===
    chocolateGood.length,
  "chocolate search drops candles and lip balm"
);

assert(
  filterProductsForSearch([...cakeJunk, ...cakeGood], "birthday cake").length === cakeGood.length,
  "cake search drops toppers and candles"
);

assert(
  filterProductsForSearch(
    [...chocolateGood, ...familyUnsafe],
    "options",
    "Show me options under LKR 3,000"
  ).every((p) => !familyUnsafe.find((u) => u.id === p.id)),
  "vague options still family-safe"
);

assert(
  resolveProductFilterKey("options", "mixed flower bouquets under 3000") === "flowers",
  "vague options inherit flower context"
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
