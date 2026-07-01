#!/usr/bin/env node
/**
 * live-regression.mjs — Blocking production traps (default: kira-peach.vercel.app).
 *
 * Usage:
 *   export KIRA_LIVE_URL=https://kira-peach.vercel.app/api/chat
 *   node scripts/live-regression.mjs
 *   node scripts/live-regression.mjs --json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sendTestCase } from "./test-runner.mjs";
import { validateSearchRelevance } from "./search-relevance.mjs";
import { validateNoContextBleed, buildMessagesFromPersona } from "./context-relevance.mjs";
import { scoreCeoLens, ceoPassAt90 } from "./ceo-lens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "test-results", "live-regression.json");

export const LIVE_URL =
  process.env.KIRA_LIVE_URL ??
  process.env.KIRA_API_URL ??
  "https://kira-peach.vercel.app/api/chat";

/** Canonical traps — any failure blocks release. */
export const LIVE_TRAPS = [
  {
    id: "LIVE-S001",
    group: "S",
    msg: "show me chocolates and flowers",
    note: "Combo repro — no ribbon/sculpture cakes",
    checks: ["products", "searchRelevance"],
  },
  {
    id: "LIVE-S002",
    group: "S",
    msg: "flowers with chocolates",
    note: "Bare combo conjunction",
    checks: ["productsOrHonest", "searchRelevance"],
  },
  {
    id: "LIVE-S003",
    group: "S",
    msg: "send flowers and chocolates to Colombo",
    note: "Combo + delivery city",
    checks: ["products", "searchRelevance"],
  },
  {
    id: "LIVE-T001",
    group: "T",
    msg: "show me flowers on Kapruka",
    note: "Flower purity — no pens/cards",
    checks: ["productsOrHonest", "searchRelevance", "noFlowerJunk"],
  },
  {
    id: "LIVE-T002",
    group: "T",
    msg: "show me chocolates under 3000",
    note: "Chocolate purity",
    checks: ["productsOrHonest", "searchRelevance"],
  },
  {
    id: "LIVE-T003",
    group: "T",
    msg: "mixed flower bouquets under 3000",
    note: "Bouquet budget purity",
    checks: ["productsOrHonest", "searchRelevance", "noFlowerJunk"],
  },
  {
    id: "LIVE-U001",
    group: "U",
    request: {
      messages: [
        { role: "user", content: "show me flowers on Kapruka" },
        { role: "assistant", content: "Here are picks!" },
        { role: "user", content: "show me chocolates on Kapruka" },
      ],
    },
    note: "Context bleed flowers→chocolates",
    checks: ["productsOrHonest", "noContextBleed", "searchRelevance"],
  },
  {
    id: "LIVE-V001",
    group: "V",
    msg: "just a gift",
    note: "Vague — no premature carousel",
    checks: ["noPrematureProducts"],
  },
  {
    id: "LIVE-V002",
    group: "V",
    msg: "hi",
    note: "Greeting — no carousel",
    checks: ["noPrematureProducts"],
  },
  {
    id: "LIVE-W001",
    group: "W",
    msg: "wife mad send roses Colombo don't tell me to hand deliver",
    note: "Repair — Kapruka delivery not DIY",
    checks: ["noHandDeliver", "productsOrHonest"],
  },
];

const FLOWER_JUNK =
  /\b(greeting\s*card|key\s*tag|keytag|key\s*chain|crochet|everbloom|mini\s*flora|flora\s*bunch|artificial|journal|pen\s*set|pen\s*gift|executive\s*pen)\b/i;
const PREACHY = /hand[- ]?deliver|pick up yourself|go see her in person/i;
const HONEST_EMPTY =
  /couldn'?t find|nothing in stock|no products in stock|not in stock|try a different|different category/i;

function buildRequest(trap) {
  if (trap.request) return { cart: [], language: "en", ...trap.request };
  return { messages: [{ role: "user", content: trap.msg }], cart: [], language: "en" };
}

function userMsg(trap) {
  if (trap.msg) return trap.msg;
  const msgs = trap.request?.messages ?? [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "user") return msgs[i].content ?? "";
  }
  return "";
}

function runChecks(trap, result) {
  const reasons = [];
  const products = result.events?.find((e) => e.t === "products")?.v ?? [];
  const text = result.responseText ?? "";
  const msg = userMsg(trap);
  const messages = buildMessagesFromPersona(trap);

  if (result.error) reasons.push(result.error);

  for (const check of trap.checks ?? []) {
    switch (check) {
      case "products":
        if (!products.length) reasons.push("Expected products carousel");
        break;
      case "productsOrHonest":
        if (!products.length && !HONEST_EMPTY.test(text)) {
          reasons.push("Expected products OR honest empty message");
        }
        break;
      case "searchRelevance": {
        const rel = validateSearchRelevance(msg, products);
        if (!rel.pass) reasons.push(`Search relevance: ${rel.violations.slice(0, 2).join("; ")}`);
        break;
      }
      case "noContextBleed": {
        const bleed = validateNoContextBleed(messages, products);
        if (!bleed.pass) reasons.push(bleed.violations.slice(0, 2).join("; "));
        break;
      }
      case "noFlowerJunk": {
        const junk = products.filter((p) => FLOWER_JUNK.test(`${p.name ?? ""} ${p.category ?? ""}`));
        if (junk.length) reasons.push(`Flower junk: ${junk.map((p) => p.name).join(", ")}`);
        break;
      }
      case "noPrematureProducts":
        if (products.length) reasons.push("Showed products on vague/zero-context message");
        break;
      case "noHandDeliver":
        if (PREACHY.test(text)) reasons.push("Preachy hand-deliver advice");
        break;
      default:
        break;
    }
  }
  return reasons;
}

export async function runLiveRegression(apiUrl = LIVE_URL) {
  const prev = process.env.KIRA_API_URL;
  process.env.KIRA_API_URL = apiUrl;
  const results = [];

  try {
    for (const trap of LIVE_TRAPS) {
      const result = await sendTestCase({ request: buildRequest(trap), checks: [] });
      const reasons = runChecks(trap, result);
      const passed = reasons.length === 0;
      const persona = { msg: trap.msg, ...trap };
      const ceoLens = scoreCeoLens(trap.group, persona, result.responseText ?? "", result.events ?? [], passed);

      results.push({
        id: trap.id,
        group: trap.group,
        note: trap.note,
        passed,
        reasons,
        productCount: (result.events?.find((e) => e.t === "products")?.v ?? []).length,
        response: (result.responseText ?? "").slice(0, 200),
        ceoLens,
        ceoPass90: ceoPassAt90(ceoLens) && passed,
      });
      await new Promise((r) => setTimeout(r, 800));
    }
  } finally {
    if (prev === undefined) delete process.env.KIRA_API_URL;
    else process.env.KIRA_API_URL = prev;
  }

  const passed = results.filter((r) => r.passed).length;
  const ceoPass = results.filter((r) => r.ceoPass90).length;
  const total = results.length;
  return {
    apiUrl,
    total,
    passed,
    failed: total - passed,
    personaPct: Math.round((passed / total) * 100),
    ceoPct: Math.round((ceoPass / total) * 100),
    allPass: passed === total && ceoPass / total >= 0.9,
    results,
  };
}

async function main() {
  const json = process.argv.includes("--json");
  console.log(`\nLive regression → ${LIVE_URL}\n`);
  const summary = await runLiveRegression();
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2));

  for (const r of summary.results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(`${icon} ${r.id} ${r.note}${r.reasons.length ? ` — ${r.reasons.join("; ")}` : ""}`);
  }

  console.log(
    `\n${summary.passed}/${summary.total} passed (${summary.personaPct}%) | CEO ≥90: ${summary.ceoPct}%`
  );
  console.log(`Written → ${OUT}\n`);

  if (json) console.log(JSON.stringify(summary, null, 2));
  if (!summary.allPass && summary.passed < summary.total) process.exit(1);
  if (summary.ceoPct < 90) process.exit(1);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
