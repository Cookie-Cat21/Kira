#!/usr/bin/env node
/** generate-category-purity.mjs — Group T (~120 single-category purity cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-category-purity.mjs");
const pad = (n) => String(n).padStart(3, "0");
const CHECKS = ["productsOrHonestEmpty", "searchRelevance", "noCategoryJunk", "noFamilyUnsafe", "noToolLeak"];

const CATEGORIES = [
  { q: "flowers", label: "flowers", extra: "noFlowerJunk" },
  { q: "roses", label: "roses", extra: "noFlowerJunk" },
  { q: "chocolates", label: "chocolates", extra: null },
  { q: "chocolate", label: "chocolate", extra: null },
  { q: "cakes", label: "cakes", extra: null },
  { q: "birthday cake", label: "birthday cake", extra: null },
  { q: "gift hampers", label: "hampers", extra: null },
  { q: "mixed flower bouquets", label: "bouquets", extra: "noFlowerJunk" },
];

const OPENERS = [
  (q) => `show me ${q} on Kapruka`,
  (q) => `show me ${q} to Colombo`,
  (q) => `${q} under 3000`,
  (q) => `show me cheapest ${q} on Kapruka`,
  (q) => `need ${q} delivered to Kandy`,
  (q) => `browse ${q} on Kapruka`,
  (q) => `show me premium ${q}`,
  (q) => `I want ${q} for anniversary`,
];

const TRAPS = [
  { msg: "show me flowers on Kapruka", note: "Trap: no greeting cards / pens", checks: [...CHECKS, "noFlowerJunk"] },
  { msg: "mixed flower bouquets under 3000", note: "Trap: bouquet budget — no junk", checks: [...CHECKS, "noFlowerJunk"] },
  { msg: "show me gift hampers on Kapruka", note: "Trap: real hampers not soap", checks: CHECKS },
  { msg: "show me chocolates under 3000", note: "Trap: no condoms/candles", checks: CHECKS },
  { msg: "show me cakes on Kapruka", note: "Trap: no toppers/candles alone", checks: CHECKS },
  { msg: "Hilton birthday cake", note: "Trap: brand cake not junk", checks: CHECKS },
];

function build() {
  const out = [];
  let n = 1;
  const push = (e) => {
    if (n > 120) return;
    out.push({ id: `T${pad(n++)}`, ...e });
  };

  for (const t of TRAPS) push(t);

  for (const cat of CATEGORIES) {
    for (const op of OPENERS) {
      if (n > 120) break;
      const checks = cat.extra ? [...CHECKS, cat.extra] : [...CHECKS];
      push({ msg: op(cat.q), checks, note: `Purity: ${cat.label}` });
    }
  }

  const cities = ["Colombo", "Galle", "Jaffna", "Negombo"];
  let fi = 0;
  while (n <= 120) {
    const cat = CATEGORIES[fi % CATEGORIES.length];
    const city = cities[fi % cities.length];
    const budget = 1500 + (fi % 7) * 1000;
    const checks = cat.extra ? [...CHECKS, cat.extra] : [...CHECKS];
    push({
      msg: `show me ${cat.q} under ${budget} to ${city}`,
      checks,
      note: `Fill ${fi}: ${cat.label}+budget+city`,
    });
    fi++;
  }
  return out.slice(0, 120);
}

const GROUP_T = build();
const body = `/** AUTO-GENERATED — node scripts/generate-category-purity.mjs */
export const GROUP_T = ${JSON.stringify(GROUP_T, null, 2)};
export const CATEGORY_PURITY_COUNT = ${GROUP_T.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_T.length} personas → ${OUT}`);
