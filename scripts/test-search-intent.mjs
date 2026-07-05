#!/usr/bin/env node
/** Smoke test search intent via local/prod API — node scripts/test-search-intent.mjs */
const API = process.env.KIRA_API_URL ?? "http://localhost:3000/api/chat";

const CASES = [
  "show me red roses under 5000 colombo",
  "I need rice and dhal for myself, deliver Colombo",
  "something cheap for amma colombo",
  "under 5000",
];

async function run(msg) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: msg }], cart: [], language: "en" }),
  });
  const text = await res.text();
  let products = 0;
  let suggestions = 0;
  for (const part of text.split("\n\n")) {
    if (!part.startsWith("data: ")) continue;
    try {
      const { t, v } = JSON.parse(part.slice(6));
      if (t === "products") products = v?.length ?? 0;
      if (t === "suggestions") suggestions = v?.length ?? 0;
    } catch {
      /* skip */
    }
  }
  return { ok: res.ok, products, suggestions };
}

let passed = 0;
for (const msg of CASES) {
  try {
    const r = await run(msg);
    const isAsk = msg === "under 5000";
    const ok = isAsk ? r.products === 0 : r.ok && (r.products > 0 || msg.includes("rice"));
    console.log(`${ok ? "✓" : "✗"} ${msg.slice(0, 45)} — products:${r.products} chips:${r.suggestions}`);
    if (ok) passed++;
    await new Promise((x) => setTimeout(x, 1500));
  } catch (e) {
    console.log(`✗ ${msg.slice(0, 45)} — ${e.message}`);
  }
}
console.log(`\n${passed}/${CASES.length} passed`);
process.exit(passed >= 3 ? 0 : 1);
