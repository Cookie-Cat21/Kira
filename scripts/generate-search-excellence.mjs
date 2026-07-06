#!/usr/bin/env node
/** generate-search-excellence.mjs — Group AA (400 search excellence cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-search-excellence.mjs");
const pad = (n) => String(n).padStart(3, "0");
const BASE_CHECKS = ["productsOrHonestEmpty", "noToolLeak", "noFamilyUnsafe"];

const FAMILIES = [
  {
    prefix: "AA-G",
    count: 80,
    templates: [
      { msg: "I need rice and dhal for myself deliver {city}", checks: [...BASE_CHECKS, "noForcedGiftTone"] },
      { msg: "groceries for me {city} under {budget}", checks: [...BASE_CHECKS, "noForcedGiftTone"] },
      { msg: "show me grocery essentials on Kapruka", checks: BASE_CHECKS },
      { msg: "restock soap and cleaning for myself", checks: BASE_CHECKS },
    ],
    cities: ["Colombo", "Kandy", "Galle"],
    budgets: ["3000", "5000", "8000"],
  },
  {
    prefix: "AA-E",
    count: 60,
    templates: [
      { msg: "electronics under {budget} buying for myself", checks: BASE_CHECKS },
      { msg: "show me phone chargers on Kapruka under {budget}", checks: BASE_CHECKS },
      { msg: "home essentials for me {city}", checks: BASE_CHECKS },
    ],
    cities: ["Colombo", "Kandy"],
    budgets: ["2500", "3500", "5000"],
  },
  {
    prefix: "AA-B",
    count: 60,
    templates: [
      { msg: "gift under {budget} to {city}", checks: [...BASE_CHECKS, "budgetRespected"] },
      { msg: "flowers for amma under {budget} {city}", checks: BASE_CHECKS },
      { msg: "birthday cake under {budget} deliver {city}", checks: BASE_CHECKS },
    ],
    cities: ["Colombo", "Kandy", "Negombo"],
    budgets: ["3000", "5000", "10000"],
  },
  {
    prefix: "AA-V",
    count: 40,
    templates: [
      { msg: "something for amma {city}", checks: ["noPrematureProducts", "noToolLeak"] },
      { msg: "something cheap for my friend", checks: BASE_CHECKS },
      { msg: "I need something nice under {budget}", checks: BASE_CHECKS },
    ],
    cities: ["Colombo", "Kandy"],
    budgets: ["2000", "4000"],
  },
  {
    prefix: "AA-M",
    count: 40,
    templates: [
      { msg: "flowers and chocolates under {budget}", checks: BASE_CHECKS },
      { msg: "cake and flowers to {city}", checks: BASE_CHECKS },
    ],
    cities: ["Colombo", "Kandy"],
    budgets: ["4000", "6000"],
  },
  {
    prefix: "AA-Z",
    count: 40,
    templates: [
      { msg: "eggless cake kandy under {budget}", checks: BASE_CHECKS },
      { msg: "show me vaporizer mosquito", checks: BASE_CHECKS },
    ],
    cities: ["Kandy", "Colombo"],
    budgets: ["5000", "8000"],
  },
  {
    prefix: "AA-L",
    count: 40,
    templates: [
      { msg: "machang mata roses ona {city}", checks: [...BASE_CHECKS, "replyLanguageEn"] },
      { msg: "gift venum colombo under {budget}", checks: [...BASE_CHECKS, "replyLanguageEn"] },
      { msg: "මට මල් ඕන {city}", checks: [...BASE_CHECKS, "replyLanguageSi"] },
    ],
    cities: ["Colombo", "Kandy"],
    budgets: ["4000", "6000"],
  },
  {
    prefix: "AA-C",
    count: 40,
    templates: [
      { msg: "red roses under 5000 colombo", checks: [...BASE_CHECKS, "budgetRespected"] },
      { msg: "show me electronics under 3500 for myself", checks: BASE_CHECKS },
    ],
    cities: ["Colombo"],
    budgets: ["3500", "5000"],
  },
];

function build() {
  const out = [];
  let n = 1;
  for (const fam of FAMILIES) {
    let i = 0;
    let famCount = 0;
    while (famCount < fam.count) {
      const t = fam.templates[i % fam.templates.length];
      const city = fam.cities[i % fam.cities.length];
      const budget = fam.budgets[i % fam.budgets.length];
      const msg = t.msg.replace(/\{city\}/g, city).replace(/\{budget\}/g, budget);
      out.push({
        id: `AA${pad(n++)}`,
        msg,
        checks: t.checks,
        note: `${fam.prefix}: ${t.msg}`,
      });
      famCount++;
      i++;
    }
  }
  return out.slice(0, 400);
}

const GROUP_AA = build();
const body = `/** AUTO-GENERATED — node scripts/generate-search-excellence.mjs */
export const GROUP_AA = ${JSON.stringify(GROUP_AA, null, 2)};
export const SEARCH_EXCELLENCE_COUNT = ${GROUP_AA.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_AA.length} personas → ${OUT}`);
