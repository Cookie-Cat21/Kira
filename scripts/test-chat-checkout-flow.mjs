#!/usr/bin/env node
/**
 * End-to-end chat checkout flow smoke test (multi-turn via /api/chat).
 * Usage: KIRA_API_URL=http://localhost:3107/api/chat node scripts/test-chat-checkout-flow.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "test-results", "chat-checkout-flow.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function productsFrom(events) {
  const e = events.find((x) => x.t === "products");
  return Array.isArray(e?.v) ? e.v : [];
}

function summarize(events) {
  return {
    products: productsFrom(events).length,
    checkout: events.some((e) => e.t === "checkout"),
    payLink: events.some((e) => e.t === "payLink"),
    steps: events.filter((e) => e.t === "step").map((e) => e.v),
    errors: events.filter((e) => e.t === "error").map((e) => e.v),
  };
}

async function turn(messages, cart = [], extra = {}) {
  const result = await sendTestCase({
    request: { messages, cart, language: "en", ...extra },
    checks: [],
  });
  return result;
}

async function main() {
  await assertDevServerAvailable();
  const log = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deliveryDate = tomorrow.toISOString().slice(0, 10);

  console.log("\n=== Chat checkout flow test ===\n");

  // Turn 1 — search
  const t1 = await turn([{ role: "user", content: "show me flowers on Kapruka to Colombo" }]);
  log.push({ step: 1, user: "show me flowers on Kapruka to Colombo", ...summarize(t1.events), response: t1.responseText?.slice(0, 200), error: t1.error });
  console.log(`1. Search flowers: ${t1.error ? "ERR " + t1.error : summarize(t1.events).products + " products"}`);

  const product = productsFrom(t1.events)[0];
  if (!product?.id) {
    console.log("   FAIL — no products to add to cart");
    await writeReport(log, false);
    process.exit(1);
  }

  const cart = [
    {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency ?? "LKR",
        image: product.image ?? null,
        url: product.url ?? "https://kapruka.com",
      },
      quantity: 1,
    },
  ];

  await sleep(1500);

  // Turn 2 — ready to checkout (empty details)
  const t2 = await turn(
    [
      { role: "user", content: "show me flowers on Kapruka to Colombo" },
      { role: "assistant", content: t1.responseText || "Here are flowers." },
      { role: "user", content: "ready to checkout" },
    ],
    cart
  );
  log.push({ step: 2, user: "ready to checkout", ...summarize(t2.events), response: t2.responseText?.slice(0, 200), error: t2.error });
  const asksFields = /name|phone|address|recipient|deliver/i.test(t2.responseText ?? "");
  console.log(`2. Ready to checkout: ${t2.error ? "ERR" : asksFields ? "asks for fields ✓" : "response: " + t2.responseText?.slice(0, 80)}`);

  await sleep(1500);

  // Turn 3 — dump all details at once
  const allDetails = `Place the order — recipient Nimal Silva, phone 0771234567, address 45 Galle Road Colombo, deliver on ${deliveryDate}, gift message: Thinking of you`;
  const t3 = await turn(
    [
      { role: "user", content: "show me flowers on Kapruka to Colombo" },
      { role: "assistant", content: t1.responseText || "Here are flowers." },
      { role: "user", content: "ready to checkout" },
      { role: "assistant", content: t2.responseText || "Need delivery details." },
      { role: "user", content: allDetails },
    ],
    cart,
    { deliveryCity: "Colombo", deliveryDate }
  );
  log.push({ step: 3, user: allDetails, ...summarize(t3.events), response: t3.responseText?.slice(0, 300), error: t3.error });
  const t3s = summarize(t3.events);
  console.log(`3. All details dump: checkout=${t3s.checkout} payLink=${t3s.payLink} steps=${t3s.steps.join(" | ") || "none"}`);

  await sleep(1500);

  // Turn 4 — confirm if no checkout yet
  let t4 = null;
  if (!t3s.checkout && !t3s.payLink) {
    t4 = await turn(
      [
        ...[
          { role: "user", content: "show me flowers on Kapruka to Colombo" },
          { role: "assistant", content: t1.responseText || "" },
          { role: "user", content: "ready to checkout" },
          { role: "assistant", content: t2.responseText || "" },
          { role: "user", content: allDetails },
          { role: "assistant", content: t3.responseText || "" },
        ],
        { role: "user", content: "yes place the order" },
      ],
      cart,
      { deliveryCity: "Colombo", deliveryDate }
    );
    log.push({ step: 4, user: "yes place the order", ...summarize(t4.events), response: t4.responseText?.slice(0, 300), error: t4.error });
    const t4s = summarize(t4.events);
    console.log(`4. Confirm place order: checkout=${t4s.checkout} payLink=${t4s.payLink}`);
  }

  const final = t4 ?? t3;
  const finalSummary = summarize(final.events);
  const passed =
    !final.error &&
    cart.length > 0 &&
    asksFields &&
    (finalSummary.checkout || finalSummary.payLink || /checkout|pay|place|order ref|KP-/i.test(final.responseText ?? ""));

  console.log("\n--- Result ---");
  console.log(passed ? "PASS — chat checkout path produced checkout/pay link or order confirmation" : "PARTIAL — flow ran but no pay link yet (may need more turns or Groq tool round)");
  if (finalSummary.checkout) {
    const co = final.events.find((e) => e.t === "checkout")?.v;
    console.log(`   Order ref: ${co?.orderRef ?? "n/a"}`);
    console.log(`   Pay URL: ${co?.checkoutUrl ? co.checkoutUrl.slice(0, 60) + "..." : "n/a"}`);
  }
  console.log(`   Final reply: ${final.responseText?.slice(0, 120)}...\n`);

  await writeReport(log, passed);
  process.exit(passed ? 0 : 1);
}

async function writeReport(log, passed) {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ passed, at: new Date().toISOString(), log }, null, 2) + "\n");
  console.log(`Log: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
