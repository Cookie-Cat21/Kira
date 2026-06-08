/* eslint-disable @typescript-eslint/no-unused-expressions */

/**
 * Kira E2E test suite — runs against http://localhost:3000
 * Usage: node scripts/kira-test.mjs
 */

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const API_TIMEOUT = 35_000; // MCP + LLM can be slow

const results = [];

const pass = (name, note = "") => {
  results.push({ status: "PASS", name, note });
  console.log(`  ✅ PASS  ${name}${note ? " — " + note : ""}`);
};
const fail = (name, note = "") => {
  results.push({ status: "FAIL", name, note });
  console.error(`  ❌ FAIL  ${name}${note ? " — " + note : ""}`);
};
const skip = (name, note = "") => {
  results.push({ status: "SKIP", name, note });
  console.log(`  ⏭️  SKIP  ${name}${note ? " — " + note : ""}`);
};

/** Type text into the React-controlled textarea and press Enter */
async function sendMessage(page, text) {
  const ta = page.locator("textarea");
  await ta.click();
  await ta.pressSequentially(text, { delay: 30 });
  await ta.press("Enter");
}

/** Get the last Kira (assistant) message text.
 *  Kira bubbles use the ReactMarkdown `.prose` wrapper; user bubbles don't.
 */
async function lastKiraText(page) {
  return page.evaluate(() => {
    const proses = Array.from(document.querySelectorAll(".prose"));
    // Return the last prose div's text (most recent Kira message)
    return proses.length > 0 ? (proses[proses.length - 1].textContent?.trim() ?? "") : "";
  });
}

/** Wait until the response stream finishes.
 *  While loading: aria-label="Stop". After done: aria-label="Send".
 *  We wait for Stop to appear (loading started), then Send to reappear (done).
 */
async function waitForResponse(page, timeout = API_TIMEOUT) {
  // Step 1: wait up to 6s for loading to START (Stop button appears)
  await page.locator('[aria-label="Stop"]').waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  // Step 2: wait for loading to FINISH (Send button reappears)
  await page.locator('[aria-label="Send"]').waitFor({ state: "visible", timeout });
  await page.waitForTimeout(500);
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  console.log("\n🧪 Kira E2E Test Suite\n");

  // ── 1. Page load ─────────────────────────────────────────────────────────────
  console.log("▸ 1. Page load & initial UI");
  await page.goto(BASE, { waitUntil: "networkidle" });

  const title = await page.title();
  title.includes("Kira") ? pass("Page title") : fail("Page title", title);

  const greeting = await page.locator("p").filter({ hasText: /Shopping|Father|browsing|gift/i }).first().textContent().catch(() => null);
  greeting ? pass("Greeting visible", greeting.slice(0, 60)) : fail("Greeting missing");

  const chips = await page.locator("button").filter({ hasText: /Father|Birthday|Flowers|browsing|Track/i }).count();
  chips >= 3 ? pass(`Quick-action chips (${chips})`) : fail("Quick-action chips missing", `${chips}`);

  const cats = await page.locator("button").filter({ hasText: /Cakes|Flowers|Chocolates|Electronics/i }).count();
  cats >= 4 ? pass(`Category buttons (${cats})`) : fail("Category buttons missing");

  await page.locator("textarea").isVisible() ? pass("Textarea visible") : fail("Textarea not found");

  // ── 2. Sinhala font ───────────────────────────────────────────────────────────
  console.log("\n▸ 2. Sinhala font");
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  const fontVar = await page.evaluate(() => {
    // Try reading from html element's own style (Next.js sets CSS vars via class)
    const html = document.documentElement;
    return window.getComputedStyle(html).getPropertyValue("--font-noto-sinhala").trim();
  });
  const fontSansVar = await page.evaluate(() =>
    window.getComputedStyle(document.body).getPropertyValue("--font-sans").trim()
  );
  const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);

  console.log(`     html classes: ${htmlClass.slice(0, 80)}`);
  console.log(`     --font-noto-sinhala: "${fontVar}"`);
  console.log(`     --font-sans: "${fontSansVar}"`);
  console.log(`     body fontFamily: "${bodyFont.slice(0, 80)}"`);

  (fontVar || bodyFont.toLowerCase().includes("jakarta") || bodyFont.toLowerCase().includes("noto"))
    ? pass("Sinhala/Jakarta font vars present")
    : fail("Font vars not resolving — Next.js font injection may not be working in this browser", bodyFont.slice(0, 60));

  // ── 3. Product search (deterministic fast path) ───────────────────────────────
  console.log("\n▸ 3. Product search — fast path");
  await sendMessage(page, "show me cakes on Kapruka");

  // Register listener BEFORE sending so we don't miss the response
  const apiCallPromise = page.waitForResponse(r => r.url().includes("/api/chat"), { timeout: API_TIMEOUT }).catch(() => null);
  await sendMessage(page, "show me cakes on Kapruka");
  const apiResp = await apiCallPromise;
  apiResp ? pass(`API /api/chat called (${apiResp.status()})`) : fail("No /api/chat request fired — message may not have submitted");

  if (apiResp) {
    try {
      await page.waitForSelector('[role="list"][aria-label*="product"]', { timeout: API_TIMEOUT });
      pass("Product carousel appeared");

      const cards = await page.locator('[role="listitem"]').count();
      cards >= 1 ? pass(`Product cards (${cards})`) : fail("No product cards");

      const addBtns = await page.locator("button").filter({ hasText: /Add to cart/i }).count();
      addBtns >= 1 ? pass(`'Add to cart' buttons (${addBtns})`) : fail("No 'Add to cart' buttons");

      const prices = await page.locator("text=/LKR/").count();
      prices >= 1 ? pass(`Prices visible (${prices})`) : fail("No LKR prices");
    } catch {
      const lastText = await page.evaluate(() =>
        Array.from(document.querySelectorAll("p"))
          .map(p => p.textContent?.trim()).filter(Boolean).at(-2) ?? ""
      );
      fail("Carousel never appeared", lastText.slice(0, 80));
    }
  } else {
    skip("Carousel check — API didn't fire");
    skip("Add to cart — API didn't fire");
    skip("Prices — API didn't fire");
  }

  // ── 4. Add to cart ────────────────────────────────────────────────────────────
  console.log("\n▸ 4. Add to cart");
  const firstAdd = page.locator("button").filter({ hasText: /Add to cart/i }).first();
  if (await firstAdd.isVisible().catch(() => false)) {
    await firstAdd.click();
    await page.waitForTimeout(500);
    const inCart = await page.locator("button").filter({ hasText: /In cart/i }).count();
    inCart >= 1 ? pass("Button became 'In cart'") : fail("Button didn't change to 'In cart'");
  } else {
    skip("Add to cart — no cards visible");
  }

  // ── 5. 'More' follow-up ───────────────────────────────────────────────────────
  console.log("\n▸ 5. 'More' follow-up");
  const carouselsBeforeMore = await page.locator('[role="list"][aria-label*="product"]').count();
  await sendMessage(page, "more please");

  try {
    await waitForResponse(page);
    const carouselsAfterMore = await page.locator('[role="list"][aria-label*="product"]').count();
    if (carouselsAfterMore > carouselsBeforeMore) {
      pass("Second carousel appeared after 'more please'");
    } else {
      // Check if Kira gave a graceful message about same results
      const lastMsg = await lastKiraText(page);
      if (/same|try|different|category|range/i.test(lastMsg)) {
        pass("'More' gracefully acknowledged (MCP cache — same results)", lastMsg.slice(0, 80));
      } else {
        fail("No new carousel and no graceful fallback for 'more'", lastMsg.slice(0, 80));
      }
    }
  } catch {
    fail("'More' request timed out");
  }

  // ── 6. LLM — natural language ─────────────────────────────────────────────────
  console.log("\n▸ 6. LLM — natural language query");
  await page.reload({ waitUntil: "networkidle" });
  await sendMessage(page, "I need a birthday gift for my dad under LKR 5000");

  try {
    await waitForResponse(page);
    const bubbles = await page.locator(".animate-fade-up").count();
    const lastMsg = await lastKiraText(page);
    const hasQuestion = /\?/.test(lastMsg);
    const hasProducts = (await page.locator('[role="list"]').count()) > 0;
    (hasQuestion || hasProducts || bubbles >= 2)
      ? pass("LLM responded", lastMsg.slice(0, 80))
      : fail("LLM response looks wrong", lastMsg.slice(0, 80));
  } catch {
    fail("LLM path timed out");
  }

  // ── 7. English input → Tanglish reply (NOT Sinhala) ─────────────────────────
  console.log("\n▸ 7. Language — English input stays Tanglish");
  await page.reload({ waitUntil: "networkidle" });
  await sendMessage(page, "hey I want to send something to my amma for her birthday la");

  try {
    await waitForResponse(page);
    const lastMsg = await lastKiraText(page);
    const hasSinhala = /[඀-෿]/.test(lastMsg);
    !hasSinhala
      ? pass("English input → Tanglish (no Sinhala triggered)", lastMsg.slice(0, 80))
      : fail("English input incorrectly triggered Sinhala reply", lastMsg.slice(0, 80));
  } catch {
    fail("Language test timed out");
  }

  // ── 8. Sinhala script → Sinhala reply ────────────────────────────────────────
  console.log("\n▸ 8. Sinhala script input → Sinhala reply");
  await page.reload({ waitUntil: "networkidle" });
  await sendMessage(page, "මට ගිෆ්ට් එකක් ඕනෑ");

  try {
    await waitForResponse(page);
    const lastMsg = await lastKiraText(page);
    const hasSinhala = /[඀-෿]/.test(lastMsg);
    console.log(`     Kira replied: "${lastMsg.slice(0, 80)}"`);
    hasSinhala
      ? pass("Sinhala input → Sinhala reply ✓", lastMsg.slice(0, 60))
      : fail("Sinhala input did NOT trigger Sinhala reply", lastMsg.slice(0, 80));
  } catch {
    fail("Sinhala reply test timed out");
  }

  // ── 9. Order tracking fast path ───────────────────────────────────────────────
  console.log("\n▸ 9. Order tracking fast path");
  await page.reload({ waitUntil: "networkidle" });
  await sendMessage(page, "track order KAP123456");

  try {
    await waitForResponse(page);
    const lastMsg = await lastKiraText(page);
    /track|order|status|found|couldn't|KAP|number/i.test(lastMsg)
      ? pass("Tracking responded", lastMsg.slice(0, 80))
      : fail("Tracking response looks wrong", lastMsg.slice(0, 80));
  } catch {
    fail("Tracking fast path timed out");
  }

  // ── 10. Quick-action chip submits ─────────────────────────────────────────────
  console.log("\n▸ 10. Quick-action chip");
  await page.reload({ waitUntil: "networkidle" });
  const trackChip = page.locator("button").filter({ hasText: /Track/i }).first();
  await trackChip.click();

  try {
    await waitForResponse(page, 25_000);
    const bubbles = await page.locator(".animate-fade-up").count();
    bubbles >= 2 ? pass("Chip submits and Kira responds") : fail("Chip fired but no response");
  } catch {
    // Maybe it just prefilled the input
    const inputVal = await page.locator("textarea").inputValue();
    inputVal.length > 0
      ? pass("Chip prefilled textarea", inputVal.slice(0, 40))
      : fail("Chip did nothing");
  }

  // ── 11. Category chip ─────────────────────────────────────────────────────────
  console.log("\n▸ 11. Category chip → products");
  await page.reload({ waitUntil: "networkidle" });
  const cakeChip = page.locator("button").filter({ hasText: /Cakes/ }).first();
  await cakeChip.click();

  try {
    await page.waitForSelector('[role="list"][aria-label*="product"]', { timeout: API_TIMEOUT });
    pass("Category chip triggers product carousel");
  } catch {
    const lastMsg = await lastKiraText(page);
    fail("Category chip did not produce carousel", lastMsg.slice(0, 80));
  }

  // ── 12. Product quick-view modal ──────────────────────────────────────────────
  console.log("\n▸ 12. Product quick-view modal");
  const firstCard = page.locator('[role="listitem"]').first();
  if (await firstCard.isVisible().catch(() => false)) {
    await firstCard.click();
    await page.waitForTimeout(1500);
    const modal = await page.locator('[role="dialog"]').isVisible().catch(() => false)
      || await page.locator(".fixed.inset-0").isVisible().catch(() => false);
    if (modal) {
      pass("Quick-view modal opens");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const stillOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      !stillOpen ? pass("Modal closes on Escape") : fail("Modal did not close on Escape");
    } else {
      fail("Quick-view modal did not open on card click");
    }
  } else {
    skip("Quick-view — no product cards visible");
  }

  // ── 13. Console errors ────────────────────────────────────────────────────────
  console.log("\n▸ 13. Console errors");
  const realErrors = consoleErrors.filter(e =>
    !e.includes("Fast Refresh") && !e.includes("favicon") && !e.includes("404")
  );
  realErrors.length === 0
    ? pass("No JS console errors")
    : fail(`${realErrors.length} console error(s)`, realErrors.slice(0, 2).join(" | ").slice(0, 120));

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(65));
  const p = results.filter(r => r.status === "PASS").length;
  const f = results.filter(r => r.status === "FAIL").length;
  const s = results.filter(r => r.status === "SKIP").length;
  console.log(`  ✅ Passed : ${p}   ❌ Failed: ${f}   ⏭️  Skipped: ${s}`);
  console.log("─".repeat(65));

  if (f > 0) {
    console.log("\nFailed:");
    results.filter(r => r.status === "FAIL").forEach(r =>
      console.log(`  • ${r.name}${r.note ? ": " + r.note : ""}`)
    );
  }

  await browser.close();
}

run().catch(e => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
