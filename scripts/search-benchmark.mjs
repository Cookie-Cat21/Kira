#!/usr/bin/env node
/**
 * Live benchmark B01–B10 against KIRA_API_URL (production by default).
 * Run: node scripts/search-benchmark.mjs
 */
const API =
  process.env.KIRA_API_URL ?? "https://kira-peach.vercel.app/api/chat";

const CASES = [
  { id: "B01", msg: "show me red roses under 5000 colombo", check: (r) => r.hasProducts && r.budgetOk },
  { id: "B02", msg: "I need rice and dhal for myself, deliver Colombo", check: (r) => r.hasProducts || r.honestEmpty },
  { id: "B03", msg: "show me electronics under 3500 — buying for myself", check: (r) => r.productCount >= 1 },
  { id: "B04", msg: "something cheap for amma colombo", check: (r) => r.hasProducts },
  { id: "B05", msg: "birthday cake eggless kandy tomorrow", check: (r) => r.hasProducts || r.honestEmpty },
  { id: "B06", msg: "show me", followUp: "oke", check: (r) => !r.toolLeak },
  { id: "B07", msg: "machang mata roses ona colombo", check: (r) => r.hasProducts && r.englishReply },
  { id: "B08", msg: "මට මල් ඕන කොළඹ", check: (r) => r.hasProducts && r.sinhalaReply, lang: "si" },
  { id: "B09", msg: "flowers and chocolates under 4000", check: (r) => r.hasProducts },
  { id: "B10", msg: "track order KP12345", check: (r) => r.hasTracking && !r.hasProducts },
];

const SI_RE = /[඀-෿]/;

async function chat(msg, extra = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: msg }],
      cart: [],
      language: extra.lang ?? "en",
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let content = "";
  let products = [];
  let tracking = null;
  let suggestions = [];
  for (const part of text.split("\n\n")) {
    if (!part.startsWith("data: ")) continue;
    try {
      const { t, v } = JSON.parse(part.slice(6));
      if (t === "token") content += v;
      if (t === "products") products = v;
      if (t === "tracking") tracking = v;
      if (t === "suggestions") suggestions = v;
    } catch {
      /* skip */
    }
  }
  const maxPrice = 5000;
  const budgetOk = products.length === 0 || products.some((p) => p.price <= maxPrice);
  return {
    content,
    products,
    suggestions,
    tracking,
    hasProducts: products.length > 0,
    productCount: products.length,
    budgetOk,
    honestEmpty: !products.length && /nothing|stock|honest|hamper/i.test(content),
    toolLeak: /<function=|kapruka_search_products/i.test(content),
    englishReply: !SI_RE.test(content),
    sinhalaReply: SI_RE.test(content),
    hasTracking: !!tracking,
  };
}

let passed = 0;
const results = [];

for (const c of CASES) {
  try {
    let r = await chat(c.msg, { lang: c.lang });
    if (c.followUp) {
      await chat(c.msg);
      r = await chat(c.followUp);
    }
    const ok = c.check(r);
    results.push({ id: c.id, ok, productCount: r.productCount, suggestions: r.suggestions?.length ?? 0 });
    console.log(`${ok ? "✓" : "✗"} ${c.id} — products:${r.productCount} suggestions:${r.suggestions?.length ?? 0}`);
    if (ok) passed++;
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    console.log(`✗ ${c.id} — ${e.message}`);
    results.push({ id: c.id, ok: false, error: e.message });
  }
}

import { mkdir, writeFile } from "node:fs/promises";
await mkdir("test-results/search-excellence", { recursive: true });
await writeFile(
  "test-results/search-excellence/benchmark-latest.json",
  JSON.stringify({ passed, total: CASES.length, results, at: new Date().toISOString() }, null, 2)
);
console.log(`\nBenchmark: ${passed}/${CASES.length}`);
process.exit(passed === CASES.length ? 0 : 1);
