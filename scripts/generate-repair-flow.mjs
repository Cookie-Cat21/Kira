#!/usr/bin/env node
/** generate-repair-flow.mjs — Group W (~60 relationship repair / delivery tone cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-repair-flow.mjs");
const pad = (n) => String(n).padStart(3, "0");
const BASE = ["noHandDeliver", "noToolLeak"];

const SEEDS = [
  { msg: "my wife is angry send roses to Colombo", checks: [...BASE, "productsOrHonestEmpty"], note: "Angry wife roses" },
  { msg: "gf mad send flowers to her office Colombo", checks: [...BASE, "productsOrHonestEmpty"], note: "GF office flowers" },
  { msg: "she's mad what should I send to her office", checks: [...BASE, "asksClarifyingOrProducts"], note: "Vague office repair" },
  { msg: "I messed up send orchids to her workplace Kandy", checks: [...BASE, "productsOrHonestEmpty"], note: "Messed up orchids" },
  { msg: "she blocked me on WhatsApp can you still deliver flowers Colombo", checks: [...BASE, ["text", /deliver|send|yes|can|colombo|flowers/i]], note: "Blocked contact" },
  { msg: "she's mad at me for coming home late send flowers don't tell me to hand deliver", checks: [...BASE, "products", ["noText", /hand.?deliver|pick up yourself|go see her/i]], note: "Anti hand-deliver" },
  { msg: "wife kopa send flowers colombo machang", checks: [...BASE, "productsOrHonestEmpty"], note: "Tanglish angry wife" },
  { msg: "I screwed up send her chocolates and a card to Kandy", checks: [...BASE, "productsOrHonestEmpty"], note: "Chocolates + card" },
  { msg: "partner angry need gift to say sorry deliver to Galle", checks: [...BASE, "productsOrHonestEmpty"], note: "Partner Galle" },
  { msg: "can Kapruka deliver flowers to her office in Colombo if she's mad at me", checks: [...BASE, ["text", /deliver|send|yes|can|kapruka/i], ["noText", /hand.?deliver/i]], note: "Kapruka capability" },
];

const CITIES = ["Colombo", "Kandy", "Galle", "Negombo", "Matara"];
const PRODUCTS = ["roses", "flowers", "chocolates", "a bouquet", "something sweet"];

function build() {
  const out = [];
  let n = 1;
  for (const s of SEEDS) {
    if (n > 60) break;
    out.push({ id: `W${pad(n++)}`, ...s });
  }
  const emotions = ["is angry", "is mad at me", "is furious", "won't pick up", "is giving silent treatment"];
  let fi = 0;
  while (n <= 60) {
    const emo = emotions[fi % emotions.length];
    const city = CITIES[fi % CITIES.length];
    const prod = PRODUCTS[fi % PRODUCTS.length];
    out.push({
      id: `W${pad(n++)}`,
      msg: `my wife ${emo} send ${prod} to ${city}`,
      checks: [...BASE, "productsOrHonestEmpty"],
      note: `Generated repair ${fi}`,
    });
    fi++;
  }
  return out.slice(0, 60);
}

const GROUP_W = build();
const body = `/** AUTO-GENERATED — node scripts/generate-repair-flow.mjs */
export const GROUP_W = ${JSON.stringify(GROUP_W, null, 2)};
export const REPAIR_FLOW_COUNT = ${GROUP_W.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_W.length} personas → ${OUT}`);
