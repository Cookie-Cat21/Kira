#!/usr/bin/env node
/**
 * generate-search-edge.mjs — Group S (~200 search routing edge cases).
 * Run: node scripts/generate-search-edge.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-search-edge.mjs");

const pad = (n) => String(n).padStart(3, "0");
const BASE_CHECKS = [
  "productsOrHonestEmpty",
  "searchRelevance",
  "noCategoryJunk",
  "noFamilyUnsafe",
  "noToolLeak",
];

const CITIES = ["Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Matara"];
const BUDGETS = [1500, 2000, 3000, 4000, 5000, 8000, 12000];

const PAIR_COMBOS = [
  ["flowers", "chocolates"],
  ["chocolates", "flowers"],
  ["roses", "chocolate"],
  ["flowers", "chocolate"],
  ["cake", "flowers"],
  ["flowers", "cake"],
  ["chocolate", "cake"],
  ["cake", "chocolate"],
  ["hamper", "flowers"],
  ["gift hamper", "chocolates"],
  ["roses", "chocolates"],
  ["bouquet", "chocolate box"],
];

const PHRASE_COMBOS = [
  "flowers and chocolates for anniversary",
  "birthday cake and roses",
  "chocolates with flowers",
  "flowers with chocolate",
  "chocolate and flower bouquet",
  "send flowers and chocolates",
  "need roses plus chocolates",
  "show me flowers & chocolates",
];

const COMBO_OPENERS = [
  (a, b) => `show me ${a} and ${b}`,
  (a, b) => `show me ${a} with ${b}`,
  (a, b) => `${a} and ${b} on Kapruka`,
  (a, b) => `show me ${a} and ${b} on Kapruka`,
  (a, b) => `I want ${a} and ${b}`,
  (a, b) => `need ${a} plus ${b}`,
  (a, b) => `${a} & ${b} please`,
  (a, b) => `browse ${a} and ${b}`,
  (a, b) => `show me ${a}, ${b}`,
  (a, b) => `looking for ${a} and ${b}`,
];

const SINGLE_VARIANTS = [
  { msg: "show me flowers on Kapruka", note: "Single flowers control" },
  { msg: "show me chocolates on Kapruka", note: "Single chocolate control" },
  { msg: "show me cakes on Kapruka", note: "Single cake control" },
  { msg: "show me gift hampers on Kapruka", note: "Single hamper control" },
  { msg: "birthday cake under 2000", note: "Bare cake+budget fast-path" },
  { msg: "chocolates under 3000", note: "Bare chocolate+budget" },
  { msg: "flowers to Colombo", note: "Bare flowers+city" },
  { msg: "roses for anniversary Colombo", note: "Occasion flowers" },
  { msg: "show me cheapest flowers on Kapruka", note: "Cheapest flowers sort" },
  { msg: "show me chocolates under 1500 on Kapruka", note: "Search+budget" },
  { msg: "mixed flower bouquets under 3000", note: "Bouquet budget" },
  { msg: "Hilton birthday cake", note: "Brand cake" },
  { msg: "show me roses on Kapruka to Kandy", note: "Roses+city" },
  { msg: "premium gift hamper Colombo", note: "Premium hamper" },
  { msg: "what's popular?", note: "Popular browse" },
];

const TRAP_CASES = [
  {
    msg: "show me chocolates and flowers",
    note: "Live repro — no flower-themed cakes",
  },
  {
    msg: "flowers with chocolates",
    note: "No show-me combo",
  },
  {
    msg: "show me flowers and chocolates to Colombo",
    note: "Combo+city",
  },
  {
    msg: "show me flowers and chocolates under 5000",
    note: "Combo+budget",
  },
  {
    msg: "send flowers and chocolates to her office Colombo",
    note: "Combo+delivery context",
  },
  {
    msg: "anniversary flowers and chocolates under 4000 Colombo",
    note: "Combo+occasion+budget+city",
  },
  {
    msg: "show me a flower bouquet and chocolate box",
    note: "Explicit product types",
  },
  {
    msg: "chocolate roses bouquet and flowers",
    note: "Chocolate roses + flowers",
  },
];

const MULTI_LANG = [
  { msg: "mal mal and chocolate colombo", note: "Romanized flowers+choc" },
  { msg: "show me flowers and chocolates machang", note: "Tanglish combo" },
  { msg: "roses um chocolate gift kandy", note: "Mixed romanized" },
  { msg: "birthday cake and roses colombo", note: "Cake+roses combo" },
  { msg: "gift hamper and flowers avurudu", note: "Hamper+flowers occasion" },
];

function withCityBudget(msg, city, budget) {
  let out = msg;
  if (budget) out += ` under ${budget}`;
  if (city) out += ` to ${city}`;
  return out;
}

function buildGroupS() {
  const out = [];
  let n = 1;

  const push = (entry) => {
    if (n > 200) return;
    out.push({ id: `S${pad(n++)}`, checks: [...BASE_CHECKS], ...entry });
  };

  for (const t of TRAP_CASES) push(t);

  for (const [a, b] of PAIR_COMBOS) {
    for (const opener of COMBO_OPENERS) {
      if (n > 200) break;
      const msg = opener(a, b);
      push({ msg, note: `Combo: ${a}+${b}` });
    }
  }

  for (const msg of PHRASE_COMBOS) {
    if (n > 200) break;
    push({ msg, note: `Phrase combo: ${msg.slice(0, 40)}` });
  }

  for (const v of SINGLE_VARIANTS) {
    push({ msg: v.msg, note: v.note });
    for (const city of CITIES.slice(0, 3)) {
      if (n > 200) break;
      push({ msg: withCityBudget(v.msg.replace(" on Kapruka", ""), city, null) + " on Kapruka", note: `${v.note} + ${city}` });
    }
  }

  for (const budget of BUDGETS) {
    if (n > 200) break;
    push({
      msg: `show me flowers and chocolates under ${budget}`,
      note: `Combo budget LKR ${budget}`,
    });
  }

  for (const city of CITIES) {
    if (n > 200) break;
    push({
      msg: `show me flowers and chocolates to ${city}`,
      note: `Combo city ${city}`,
    });
  }

  for (const m of MULTI_LANG) {
    if (n > 200) break;
    push(m);
  }

  // Fill remaining with rotated combo+city+budget
  let fi = 0;
  while (n <= 200) {
    const combo = PAIR_COMBOS[fi % PAIR_COMBOS.length];
    const city = CITIES[fi % CITIES.length];
    const budget = BUDGETS[fi % BUDGETS.length];
    const opener = COMBO_OPENERS[fi % COMBO_OPENERS.length];
    push({
      msg: withCityBudget(opener(combo[0], combo[1]), city, budget),
      note: `Generated combo fill ${fi}`,
    });
    fi++;
  }

  return out.slice(0, 200);
}

const GROUP_S = buildGroupS();

const body = `/** AUTO-GENERATED — node scripts/generate-search-edge.mjs */
export const GROUP_S = ${JSON.stringify(GROUP_S, null, 2)};
export const SEARCH_EDGE_COUNT = ${GROUP_S.length};
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_S.length} search edge personas → ${OUT}`);
