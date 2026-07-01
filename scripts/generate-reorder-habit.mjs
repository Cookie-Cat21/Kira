#!/usr/bin/env node
/** generate-reorder-habit.mjs — Group X (~60 one-tap reorder / CEO habit cases) */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-reorder-habit.mjs");
const pad = (n) => String(n).padStart(3, "0");

const SAMPLE_CART = [
  {
    product: {
      id: "CAKE-SAMPLE-001",
      name: "Chocolate Fudge Birthday Cake",
      price: 4500,
      currency: "LKR",
      image: "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
      category: "Cakes",
    },
    quantity: 1,
  },
];

const FULL_LAST_ORDER = {
  orderRef: "KP-GEN-X001",
  placedAt: Date.now(),
  label: "Amma's birthday cake",
  items: SAMPLE_CART,
  recipient: { name: "Amma", phone: "0771234567" },
  delivery: {
    city: "Colombo",
    address: "12 Galle Road, Colombo 03",
    date: "2026-07-15",
  },
  giftMessage: "Happy birthday Amma!",
  senderName: "Ovindu",
};

const SEEDS = [
  {
    msg: "order again",
    lastOrder: FULL_LAST_ORDER,
    checks: ["reorderOpensCheckout", "checkoutPrefill", "noToolLeak"],
    note: "Session reorder → checkout not carousel-only",
  },
  {
    msg: "buy again same as last time",
    lastOrder: FULL_LAST_ORDER,
    checks: ["reorderOpensCheckout", "checkoutPrefill", "noToolLeak"],
    note: "Buy again with full delivery snapshot",
  },
  {
    msg: "same thing as before machang",
    lastOrder: FULL_LAST_ORDER,
    checks: ["reorderOpensCheckout", "noToolLeak"],
    note: "Tanglish reorder",
  },
  {
    msg: "reorder please",
    checks: [["text", "order|previous|first|KP-|last"], "noToolLeak"],
    note: "No history — honest fallback",
  },
  {
    msg: "reorder KP12345",
    checks: ["notEmpty", "noToolLeak"],
    note: "Reorder by Kapruka ref via track_order",
  },
  {
    msg: "order again",
    lastOrder: {
      ...FULL_LAST_ORDER,
      delivery: { ...FULL_LAST_ORDER.delivery, date: "2020-01-01" },
    },
    checks: ["reorderOpensCheckout", "noToolLeak"],
    note: "Stale delivery date — should bump not fail",
  },
];

function build() {
  const out = [];
  let n = 1;
  for (const s of SEEDS) {
    if (n > 60) break;
    const { msg, lastOrder, checks, note } = s;
    out.push({
      id: `X${pad(n++)}`,
      request: {
        messages: [{ role: "user", content: msg }],
        cart: [],
        ...(lastOrder ? { lastOrder } : {}),
      },
      checks,
      note,
    });
  }
  const phrases = [
    "order again",
    "buy again",
    "same as last",
    "repeat my last order",
    "reorder please",
  ];
  const cities = ["Colombo", "Kandy", "Galle"];
  let fi = 0;
  while (n <= 60) {
    const msg = phrases[fi % phrases.length];
    const hasLast = fi % 4 !== 3;
    const city = cities[fi % cities.length];
    out.push({
      id: `X${pad(n++)}`,
      request: {
        messages: [{ role: "user", content: msg }],
        cart: [],
        ...(hasLast
          ? {
              lastOrder: {
                ...FULL_LAST_ORDER,
                orderRef: `KP-GEN-X${pad(fi + 10)}`,
                delivery: { ...FULL_LAST_ORDER.delivery, city },
              },
            }
          : {}),
      },
      checks: hasLast
        ? ["reorderOpensCheckout", "checkoutPrefill", "noToolLeak"]
        : [["text", "order|previous|first|KP-|last"], "noToolLeak"],
      note: `Generated reorder ${fi} — ${hasLast ? "with history" : "no history"}`,
    });
    fi++;
  }
  return out.slice(0, 60);
}

const GROUP_X = build();
const body = `/** AUTO-GENERATED — node scripts/generate-reorder-habit.mjs */
export const GROUP_X = ${JSON.stringify(GROUP_X, null, 2)};
export const REORDER_HABIT_COUNT = ${GROUP_X.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_X.length} personas → ${OUT}`);
