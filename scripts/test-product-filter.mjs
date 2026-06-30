#!/usr/bin/env node
/**
 * Unit tests for carousel product relevance + family-safe filtering.
 * Run: node scripts/test-product-filter.mjs
 */
import {
  FLOWER_JUNK_RE,
  CHOCOLATE_JUNK_RE,
  CAKE_JUNK_RE,
  HAMPER_JUNK_RE,
  FLOWER_INTENT_RE,
  CHOCOLATE_INTENT_RE,
  CAKE_INTENT_RE,
  HAMPER_INTENT_RE,
  FAMILY_UNSAFE_RE,
  filterFamilySafeProducts,
} from "./lib/flower-filter.mjs";

const CATEGORY_RELEVANCE_TERMS = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  chocolate:
    /chocolate|choco|cocoa|truffle|praline|fudge|brownie|munchee|cadbury|ferrero|toffee|nestle|kitkat|snickers|mars\b|biscuit|sweet/i,
  cake: /cake|cupcake|pastry|cheesecake|mousse|gateau|torte|sponge|brownie|bakery|patisserie/i,
  hampers:
    /hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|hamper\s*box|curated|munch\s*box|pantry|celebration\s*box|festive|joyful|family\s*pack|classic\s*craving|luxury\s*pantry|cravings|treats\s*hamper|grocery\s*hamper|supermarket\s*hamper/i,
};

const CATEGORY_IRRELEVANCE_TERMS = {
  flowers: FLOWER_JUNK_RE,
  chocolate: CHOCOLATE_JUNK_RE,
  cake: CAKE_JUNK_RE,
  hampers: HAMPER_JUNK_RE,
};

function resolveProductFilterKey(query, ...contextTexts) {
  const q = query.toLowerCase().trim();
  const context = [q, ...contextTexts.filter(Boolean)].join(" ");
  if (FLOWER_INTENT_RE.test(context)) return "flowers";
  if (CAKE_INTENT_RE.test(context)) return "cake";
  if (CHOCOLATE_INTENT_RE.test(context)) return "chocolate";
  if (HAMPER_INTENT_RE.test(context)) return "hampers";
  if (q === "gift hamper" || q === "gift set") return "hampers";
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
        if (key === "hampers") {
          const name = p.name ?? "";
          const body = `${name} ${p.summary ?? ""}`;
          const HAMPER_NAME =
            /\b(hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|pantry|cravings|family\s*pack|munch|celebration|fitness|hygienic|golden\s*crunch|grocery\s*hamper|joyful|classic\s*craving|luxury\s*pantry|nutty)\b/i;
          if (!HAMPER_NAME.test(name)) return false;
          if (HAMPER_JUNK_RE.test(body)) return false;
          if (/confectionery and biscuits/i.test(body) && !/\bhamper/i.test(name)) return false;
          return true;
        }
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

const hamperGood = [
  { id: "40", name: "Luxury Pantry Goals Hamper - Top Selling Hampers In Sri Lanka", price: 23500, currency: "LKR" },
  { id: "41", name: "The Classic Cravings Hamper Box", price: 23000, currency: "LKR" },
  { id: "42", name: "Family Pack Hamper - Top Selling Hampers In Sri Lanka", price: 13500, currency: "LKR" },
];
const hamperJunk = [
  { id: "43", name: "Lifebuoy Cool Fresh Body Soap 75g - Cleansers", price: 110, currency: "LKR" },
  { id: "44", name: "Ceylon Hampers Pvt Ltd", price: 140, currency: "LKR" },
  { id: "45", name: "Munchee Kalo Chocolate Biscuit 140g - Confectionery And Biscuits", price: 300, currency: "LKR" },
  { id: "46", name: "King Coconut", price: 310, currency: "LKR" },
];

assert(
  filterProductsForSearch([...hamperJunk, ...hamperGood], "gift hamper").length === hamperGood.length,
  "hamper category drops soap, coconut, biscuits, brand pages"
);

const cakeCardJunk = [
  { id: "50", name: "Pretty Pink Mini Bday Greeting Card", price: 80, currency: "LKR", summary: "Birthdaycake, Cupcake, Greetingcard" },
];
const cakeReal = [{ id: "51", name: "Chocolate Fudge Birthday Cake 2lb", price: 4500, currency: "LKR" }];
assert(
  filterProductsForSearch([...cakeCardJunk, ...cakeReal], "cake").length === cakeReal.length,
  "cake category drops greeting cards even when summary mentions cupcake"
);

assert(
  filterFamilySafeProducts([{ id: "60", name: "Wine Opener", price: 1200, currency: "LKR" }]).length === 1,
  "wine opener is family-safe kitchen item"
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
