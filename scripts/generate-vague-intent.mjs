#!/usr/bin/env node
/** generate-vague-intent.mjs — Group V (~60 vague / zero-context cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-vague-intent.mjs");
const pad = (n) => String(n).padStart(3, "0");
const CHECKS = ["noPrematureProducts", "noNothingFound", "noToolLeak"];

const SEEDS = [
  { msg: "hi", note: "Bare greeting" },
  { msg: "hey", note: "Bare hey" },
  { msg: "hello", note: "Hello" },
  { msg: "just a gift", note: "The classic vague gift" },
  { msg: "I need something", note: "Zero context" },
  { msg: "something for my friend", note: "Recipient only" },
  { msg: "under 2000", note: "Budget only" },
  { msg: "I need it by tomorrow", note: "Date only" },
  { msg: "amma ta", note: "Sinhala partial recipient" },
  { msg: "something nice lah", note: "Tanglish vague" },
  { msg: "can you help me pick something?", note: "Meta opener" },
  { msg: "I don't know what to get", note: "Helpless" },
  { msg: "something sweet", note: "Vague category" },
  { msg: "Rs 5000 budget, go", note: "Budget only command" },
  { msg: "🎂🎁💐", note: "Emoji only" },
  { msg: "help", note: "Single word help" },
  { msg: "gift", note: "Single word gift" },
  { msg: "something for amma", note: "Recipient amma" },
  { msg: "surprise for my wife", note: "Recipient only wife" },
  { msg: "I'm in Kandy, help me", note: "City + vague" },
];

const POPULAR = [
  { msg: "what's popular?", checks: ["productsOrHonestEmpty", "noToolLeak"], note: "Popular — should browse" },
  { msg: "what's trending?", checks: ["productsOrHonestEmpty", "noToolLeak"], note: "Trending browse" },
];

function build() {
  const out = [];
  let n = 1;
  for (const s of SEEDS) {
    if (n > 60) break;
    out.push({ id: `V${pad(n++)}`, checks: CHECKS, ...s });
  }
  for (const p of POPULAR) {
    if (n > 60) break;
    out.push({ id: `V${pad(n++)}`, ...p });
  }
  const variants = ["", " please", " machang", " lah", " 🎁"];
  let fi = 0;
  while (n <= 60) {
    const s = SEEDS[fi % SEEDS.length];
    const v = variants[fi % variants.length];
    out.push({
      id: `V${pad(n++)}`,
      msg: `${s.msg}${v}`.trim(),
      checks: CHECKS,
      note: `Variant ${fi}: ${s.note}`,
    });
    fi++;
  }
  return out.slice(0, 60);
}

const GROUP_V = build();
const body = `/** AUTO-GENERATED — node scripts/generate-vague-intent.mjs */
export const GROUP_V = ${JSON.stringify(GROUP_V, null, 2)};
export const VAGUE_INTENT_COUNT = ${GROUP_V.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_V.length} personas → ${OUT}`);
