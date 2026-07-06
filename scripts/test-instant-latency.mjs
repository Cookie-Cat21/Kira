#!/usr/bin/env node
/** Latency gate for instant fast-paths — node scripts/test-instant-latency.mjs */
const API = process.env.KIRA_API_URL ?? "http://localhost:3000/api/chat";
const MAX_MS = Number(process.env.INSTANT_MAX_MS ?? 400);

const CASES = [
  { msg: "hi", expectInstant: true, maxMs: MAX_MS },
  { msg: "hey", expectInstant: true, maxMs: MAX_MS },
  { msg: "hello", expectInstant: true, maxMs: MAX_MS },
  { msg: "help", expectInstant: true, maxMs: MAX_MS },
  { msg: "just a gift", expectInstant: true, maxMs: MAX_MS },
  { msg: "I need something", expectInstant: true, maxMs: MAX_MS },
  { msg: "is Kapruka legit?", expectInstant: true, maxMs: MAX_MS },
  { msg: "under 2000", expectInstant: true, maxMs: MAX_MS },
  { msg: "track my order", expectInstant: true, maxMs: MAX_MS },
];

async function run(msg) {
  const t0 = Date.now();
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: msg }], cart: [], language: "en" }),
  });
  const text = await res.text();
  let firstTokenAt = null;
  let doneAt = null;
  let steps = [];
  let content = "";
  for (const part of text.split("\n\n")) {
    if (!part.startsWith("data: ")) continue;
    const { t, v } = JSON.parse(part.slice(6));
    if (t === "token") {
      if (firstTokenAt === null) firstTokenAt = Date.now() - t0;
      content += v;
    }
    if (t === "step") steps.push(String(v));
    if (t === "done") doneAt = Date.now() - t0;
  }
  const groqStep = steps.some((s) => s === "Thinking…" || s.includes("Searching Kapruka"));
  return { ok: res.ok, firstTokenAt, doneAt, groqStep, content, steps };
}

let passed = 0;
for (const c of CASES) {
  try {
    const r = await run(c.msg);
    const instant = !r.groqStep && (r.firstTokenAt ?? 9999) <= c.maxMs;
    const ok = r.ok && instant;
    console.log(
      `${ok ? "✓" : "✗"} "${c.msg}" — ${r.firstTokenAt}ms first token, groq=${r.groqStep}`
    );
    if (ok) passed++;
    else if (r.groqStep) console.log("  → hit Groq/MCP (should be instant)");
    else console.log(`  → too slow (>${c.maxMs}ms)`);
  } catch (e) {
    console.log(`✗ "${c.msg}" — ${e.message}`);
  }
}
console.log(`\n${passed}/${CASES.length} instant paths OK (max ${MAX_MS}ms)`);
process.exit(passed === CASES.length ? 0 : 1);
