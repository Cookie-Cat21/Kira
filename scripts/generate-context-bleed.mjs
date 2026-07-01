#!/usr/bin/env node
/** generate-context-bleed.mjs — Group U (~80 multi-turn context bleed cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-context-bleed.mjs");
const pad = (n) => String(n).padStart(3, "0");
const CHECKS = ["productsOrHonestEmpty", "noContextBleed", "searchRelevance", "noFamilyUnsafe", "noToolLeak"];

const SWITCHES = [
  {
    prior: "show me flowers on Kapruka",
    current: "show me chocolates on Kapruka",
    note: "flowers → chocolates switch",
  },
  {
    prior: "show me chocolates on Kapruka",
    current: "show me flowers on Kapruka",
    note: "chocolates → flowers switch",
  },
  {
    prior: "show me cakes on Kapruka",
    current: "show me flowers on Kapruka",
    note: "cakes → flowers switch",
  },
  {
    prior: "show me flowers on Kapruka",
    current: "show me cakes on Kapruka",
    note: "flowers → cakes switch",
  },
  {
    prior: "mixed flower bouquets under 3000",
    current: "show me chocolates under 3000",
    note: "flower budget → chocolate budget",
  },
  {
    prior: "show me gift hampers on Kapruka",
    current: "show me flowers on Kapruka",
    note: "hampers → flowers",
  },
  {
    prior: "show me roses for anniversary",
    current: "show me chocolates for anniversary",
    note: "roses → chocolates occasion",
  },
  {
    prior: "birthday cake under 2000",
    current: "chocolates under 2000",
    note: "cake budget → chocolate budget",
  },
];

const VAGUE_FOLLOWUPS = [
  {
    prior: "mixed flower bouquets under 3000 for anniversary",
    current: "Show me options under LKR 3,000",
    note: "Vague options after flowers — stay in flowers",
  },
  {
    prior: "show me chocolates on Kapruka",
    current: "Show me options under LKR 3,000",
    note: "Vague options after chocolates",
  },
  {
    prior: "show me flowers on Kapruka",
    current: "more options",
    note: "More after flowers",
  },
  {
    prior: "show me chocolates on Kapruka",
    current: "more options",
    note: "More after chocolates",
  },
];

function thread(prior, current) {
  return {
    request: {
      messages: [
        { role: "user", content: prior },
        { role: "assistant", content: "Here are some picks from Kapruka!" },
        { role: "user", content: current },
      ],
    },
    checks: CHECKS,
  };
}

function build() {
  const out = [];
  let n = 1;
  const push = (e) => {
    if (n > 80) return;
    out.push({ id: `U${pad(n++)}`, ...e });
  };

  for (const s of SWITCHES) {
    push({ ...thread(s.prior, s.current), note: s.note });
    push({
      ...thread(s.prior, `${s.current} to Colombo`),
      note: `${s.note} + city`,
    });
  }

  for (const v of VAGUE_FOLLOWUPS) {
    push({ ...thread(v.prior, v.current), note: v.note });
  }

  const budgets = [2000, 3000, 4000, 5000];
  let fi = 0;
  while (n <= 80) {
    const s = SWITCHES[fi % SWITCHES.length];
    const b = budgets[fi % budgets.length];
    push({
      ...thread(s.prior, s.current.replace("3000", String(b)).replace("on Kapruka", `under ${b}`)),
      note: `Fill switch ${fi}`,
    });
    fi++;
  }
  return out.slice(0, 80);
}

const GROUP_U = build();
const body = `/** AUTO-GENERATED — node scripts/generate-context-bleed.mjs */
export const GROUP_U = ${JSON.stringify(GROUP_U, null, 2)};
export const CONTEXT_BLEED_COUNT = ${GROUP_U.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_U.length} personas → ${OUT}`);
