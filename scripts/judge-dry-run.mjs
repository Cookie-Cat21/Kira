#!/usr/bin/env node
/**
 * Judge dry-run — 10 scripted messages mimicking the Kapruka judging path.
 * Usage: node scripts/judge-dry-run.mjs
 * Requires Kira dev server on KIRA_API_URL (default http://localhost:3107/api/chat).
 */
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";

const FULL_LAST_ORDER = {
  orderRef: "KP-JUDGE-001",
  placedAt: Date.now(),
  label: "Judge test hamper",
  items: [
    {
      product: {
        id: "judge-dry-run-001",
        name: "Judge Test Chocolate",
        price: 1500,
        currency: "LKR",
      },
      quantity: 1,
    },
  ],
  recipient: { name: "Amma", phone: "0771234567" },
  delivery: {
    city: "Colombo",
    address: "12 Galle Road",
    date: "2026-07-20",
  },
};

const STEPS = [
  { label: "Greeting", message: "hey", expectNoProducts: true },
  { label: "Electronics breadth", message: "Show me electronics on Kapruka", expectProducts: true },
  { label: "Budget search", message: "chocolate under 3000 to Kandy", expectProducts: true },
  { label: "Personality repair", message: "I messed up wife is angry need to send flowers", expectProducts: true },
  { label: "Rush delivery", message: "need roses delivered today to Colombo urgent", expectProducts: true },
  { label: "Ready to checkout", message: "I am ready to checkout", cart: true, expectNoProducts: true },
  {
    label: "Reorder session (one-tap)",
    message: "order again",
    lastOrder: FULL_LAST_ORDER,
    expectReorderCheckout: true,
  },
  { label: "Sale browse", message: "anything on sale", expectProducts: true },
  { label: "Hamper browse", message: "show me a gift hamper", expectProducts: true },
  { label: "Track order ask", message: "I want to track my order", expectNoProducts: true },
];

const SAMPLE_PRODUCT = {
  id: "judge-dry-run-001",
  name: "Judge Test Chocolate",
  price: 1500,
  currency: "LKR",
};

try {
  await assertDevServerAvailable();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let passed = 0;
let failed = 0;

for (let i = 0; i < STEPS.length; i++) {
  const step = STEPS[i];
  const request = {
    messages: [{ role: "user", content: step.message }],
    cart: step.cart ? [{ product: SAMPLE_PRODUCT, quantity: 1 }] : [],
    language: "en",
    ...(step.lastOrder ? { lastOrder: step.lastOrder } : {}),
  };

  const result = await sendTestCase({ request, checks: [] });
  const hasError = result.events.some((e) => e.t === "error");
  const hasDone = result.events.some((e) => e.t === "done");
  const hasProducts = result.events.some(
    (e) => e.t === "products" && Array.isArray(e.v) && e.v.length > 0
  );
  const hasReorderCheckout = result.events.some((e) => e.t === "reorderCheckout");

  let productMismatch = false;
  if (step.expectProducts && !hasProducts) productMismatch = true;
  if (step.expectNoProducts && hasProducts) productMismatch = true;
  if (step.expectReorderCheckout && !hasReorderCheckout) productMismatch = true;

  const ok = !result.error && hasDone && !hasError && !productMismatch;

  console.log(`${ok ? "✓" : "✗"} [${i + 1}/${STEPS.length}] ${step.label} (${result.durationMs}ms)`);
  if (!ok) {
    failed++;
    if (result.error) console.log(`  error: ${result.error}`);
    if (hasError) console.log("  SSE error event received");
    if (!hasDone) console.log("  missing done event");
    if (step.expectProducts && !hasProducts) console.log("  expected a products event, got none");
    if (step.expectNoProducts && hasProducts) console.log("  unexpected products event");
    if (step.expectReorderCheckout && !hasReorderCheckout) {
      console.log("  expected reorderCheckout SSE for one-tap reorder");
    }
  } else {
    passed++;
  }

  if (i < STEPS.length - 1) {
    await new Promise((r) => setTimeout(r, 1500));
  }
}

console.log("");
console.log(`Judge dry-run: ${passed}/${STEPS.length} passed`);
process.exit(failed > 0 ? 1 : 0);
