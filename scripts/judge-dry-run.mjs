#!/usr/bin/env node
/**
 * Judge dry-run — 10 scripted messages mimicking the Kapruka judging path.
 * Usage: node scripts/judge-dry-run.mjs
 * Requires Kira dev server on KIRA_API_URL (default http://localhost:3000/api/chat).
 */
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";

// expectProducts: a `products` SSE event MUST be emitted (catches "apology
//   instead of carousel" regressions on search/breadth/reorder paths).
// expectNoProducts: a `products` event must NOT be emitted (advice / greeting /
//   field-collection turns should never show a carousel).
const STEPS = [
  { label: "Greeting", message: "hey", expectNoProducts: true },
  { label: "Electronics breadth", message: "Show me electronics on Kapruka", expectProducts: true },
  { label: "Budget search", message: "chocolate under 3000 to Kandy", expectProducts: true },
  { label: "Personality repair", message: "I messed up wife is angry need to send flowers", expectProducts: true },
  { label: "Rush delivery", message: "need roses delivered today to Colombo urgent", expectProducts: true },
  { label: "Ready to checkout", message: "I am ready to checkout", cart: true, expectNoProducts: true },
  { label: "Reorder session", message: "order again", lastOrder: true, expectProducts: true },
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
    cart: step.cart
      ? [{ product: SAMPLE_PRODUCT, quantity: 1 }]
      : [],
    language: "en",
    ...(step.lastOrder
      ? {
          lastOrder: {
            orderRef: "KP-JUDGE-001",
            placedAt: Date.now(),
            items: [{ product: SAMPLE_PRODUCT, quantity: 1 }],
          },
        }
      : {}),
  };

  const result = await sendTestCase({ request, checks: [] });
  const hasError = result.events.some((e) => e.t === "error");
  const hasDone = result.events.some((e) => e.t === "done");
  // A products event counts only when it actually carries items.
  const hasProducts = result.events.some(
    (e) => e.t === "products" && Array.isArray(e.v) && e.v.length > 0
  );
  const productMismatch =
    (step.expectProducts && !hasProducts) ||
    (step.expectNoProducts && hasProducts);
  const ok = !result.error && hasDone && !hasError && !productMismatch;

  console.log(`${ok ? "✓" : "✗"} [${i + 1}/${STEPS.length}] ${step.label} (${result.durationMs}ms)`);
  if (!ok) {
    failed++;
    if (result.error) console.log(`  error: ${result.error}`);
    if (hasError) console.log("  SSE error event received");
    if (!hasDone) console.log("  missing done event");
    if (step.expectProducts && !hasProducts) console.log("  expected a products event, got none");
    if (step.expectNoProducts && hasProducts) console.log("  unexpected products event (should be advice/text only)");
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
