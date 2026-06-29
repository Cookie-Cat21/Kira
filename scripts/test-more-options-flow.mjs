#!/usr/bin/env node
/**
 * Multi-turn "more options" smoke test — ensures repeated requests don't re-show the same carousel.
 * Usage: KIRA_API_URL=http://localhost:3107/api/chat node scripts/test-more-options-flow.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "test-results", "more-options-flow.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function productsFrom(events) {
  const e = events.find((x) => x.t === "products");
  return Array.isArray(e?.v) ? e.v : [];
}

async function turn(messages, { lastProducts, shownProducts } = {}) {
  return sendTestCase({
    request: {
      messages,
      cart: [],
      language: "en",
      ...(lastProducts ? { lastProducts } : {}),
      ...(shownProducts ? { shownProducts } : {}),
    },
    checks: [],
  });
}

function overlap(a, b) {
  const ids = new Set(a.map((p) => p.id));
  return b.filter((p) => ids.has(p.id)).length;
}

async function main() {
  await assertDevServerAvailable();
  const log = [];
  const shown = [];

  console.log("\n=== More options flow test ===\n");

  const t1 = await turn([{ role: "user", content: "show me flowers on Kapruka to Colombo" }]);
  const p1 = productsFrom(t1.events);
  shown.push(...p1);
  log.push({ step: 1, count: p1.length, ids: p1.map((p) => p.id) });
  console.log(`1. Initial search: ${p1.length} products`);

  if (p1.length === 0) {
    console.log("   FAIL — no initial products");
    await writeReport(log, false);
    process.exit(1);
  }

  await sleep(1200);

  const t2 = await turn(
    [
      { role: "user", content: "show me flowers on Kapruka to Colombo" },
      { role: "assistant", content: t1.responseText || "Here are flowers." },
      { role: "user", content: "more options" },
    ],
    { lastProducts: p1, shownProducts: shown }
  );
  const p2 = productsFrom(t2.events);
  const o2 = overlap(p1, p2);
  log.push({ step: 2, count: p2.length, overlapWithPrev: o2, text: t2.responseText?.slice(0, 120) });
  console.log(`2. More options (1st): ${p2.length} products, overlap with step 1: ${o2}`);

  if (p2.length > 0) shown.push(...p2);

  await sleep(1200);

  const t3 = await turn(
    [
      { role: "user", content: "show me flowers on Kapruka to Colombo" },
      { role: "assistant", content: t1.responseText || "" },
      { role: "user", content: "more options" },
      { role: "assistant", content: t2.responseText || "" },
      { role: "user", content: "show me more" },
    ],
    {
      lastProducts: p2.length ? p2 : p1,
      shownProducts: shown,
    }
  );
  const p3 = productsFrom(t3.events);
  const o3a = overlap(p1, p3);
  const o3b = overlap(p2, p3);
  const o3all = overlap(shown, p3);
  log.push({
    step: 3,
    count: p3.length,
    overlapWithAllShown: o3all,
    text: t3.responseText?.slice(0, 120),
  });
  console.log(`3. More options (2nd): ${p3.length} products, overlap with all shown: ${o3all}`);
  if (p3.length === 0) {
    console.log(`   (no carousel — reply: ${t3.responseText?.slice(0, 100)})`);
  }

  const passed =
    p1.length > 0 &&
    p2.length > 0 &&
    o2 === 0 &&
    (p3.length === 0 || o3all === 0);

  console.log("\n--- Result ---");
  console.log(
    passed
      ? "PASS — more options returned fresh picks (or honest empty when exhausted)"
      : p2.length > 0 && o2 > 0
      ? "FAIL — 2nd request duplicated initial carousel"
      : p3.length > 0 && o3all > 0
      ? "FAIL — 3rd request re-showed already-seen products"
      : "PARTIAL — check log"
  );

  await writeReport(log, passed);
  process.exit(passed ? 0 : 1);
}

async function writeReport(log, passed) {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ passed, at: new Date().toISOString(), log }, null, 2) + "\n");
  console.log(`Log: ${OUT}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
