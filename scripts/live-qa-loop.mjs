#!/usr/bin/env node
/**
 * live-qa-loop.mjs — Dulith-gated live URL QA (plan → traps → domain smoke).
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { spawn } from "node:child_process";
import { reviewPlanText, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";
import { BASE_CRITERIA, DOMAINS } from "./dulith-domains.mjs";
import { runLiveRegression, LIVE_URL } from "./live-regression.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "test-results", "live-qa");
const LIVE_PLAN = join(ROOT, "docs", "LIVE-QA-PLAN.md");

const GROUP_MODULE = {
  S: "./personas/generated-search-edge.mjs",
  T: "./personas/generated-category-purity.mjs",
  U: "./personas/generated-context-bleed.mjs",
  V: "./personas/generated-vague-intent.mjs",
  W: "./personas/generated-repair-flow.mjs",
};

const LIVE_CRITERIA = [
  ...BASE_CRITERIA,
  {
    id: "live_url",
    weight: 2,
    test: (t) => /kira-peach|production|live url|vercel/i.test(t),
    note: "Tests production URL not localhost",
  },
  {
    id: "blocking_traps",
    weight: 2,
    test: (t) => /live-regression|blocking|trap/i.test(t),
    note: "Blocking regression traps",
  },
  {
    id: "deploy_lag",
    weight: 1,
    test: (t) => /deploy|vercel|lag/i.test(t),
    note: "Acknowledges deploy lag risk",
  },
];

function parseArgs() {
  const a = process.argv.slice(2);
  const targetIdx = a.indexOf("--target");
  return {
    full: a.includes("--full"),
    trapsOnly: a.includes("--traps-only"),
    target: targetIdx >= 0 ? Number(a[targetIdx + 1]) : 90,
    url: process.env.KIRA_LIVE_URL ?? LIVE_URL,
  };
}

async function runDomainSmoke(domain, cfg) {
  await execFileAsync(process.execPath, [join(__dirname, domain.generator)], { cwd: ROOT });
  const modPath = GROUP_MODULE[domain.group];
  if (!modPath) return { domain: domain.id, skipped: true };
  const mod = await import(modPath);
  const list = mod[`GROUP_${domain.group}`] ?? [];
  const count = cfg.full ? list.length : domain.smoke;
  const ids = list.slice(0, count).map((p) => p.id);
  if (!ids.length) return { domain: domain.id, ran: 0, personaPct: 0, ceoPct: 0 };

  const outPath = join(OUT_DIR, `live-${domain.group}.json`);
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(__dirname, "test-personas.mjs"),
        "--group",
        domain.group.toLowerCase(),
        "--id",
        ids.join(","),
        "--concurrency",
        "1",
        "--out",
        outPath,
      ],
      { cwd: ROOT, env: { ...process.env, KIRA_API_URL: cfg.url }, stdio: "inherit" }
    );
    child.on("close", (code) => (code === 0 ? resolve() : resolve()));
  });

  const rows = JSON.parse(await readFile(outPath, "utf8"));
  const passed = rows.filter((r) => r.passed).length;
  const ceoPass = rows.filter((r) => r.ceoPass90).length;
  return {
    domain: domain.id,
    group: domain.group,
    ran: rows.length,
    passed,
    personaPct: Math.round((passed / rows.length) * 100),
    ceoPct: Math.round((ceoPass / rows.length) * 100),
  };
}

async function main() {
  const cfg = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  console.log("\n=== Phase 1: Dulith live QA plan review ===\n");
  const planText = await readFile(LIVE_PLAN, "utf8");
  const review = reviewPlanText(planText, LIVE_CRITERIA);
  console.log(`Live QA plan: ${review.excitement}/10 — ${review.verdict}\n`);
  if (!review.approved) process.exit(1);

  console.log(`=== Phase 2: Live regression traps → ${cfg.url} ===\n`);
  const traps = await runLiveRegression(cfg.url);
  for (const r of traps.results) {
    console.log(`${r.passed ? "✓" : "✗"} ${r.id} ${r.note}${r.reasons[0] ? ` — ${r.reasons[0]}` : ""}`);
  }
  console.log(`\nTraps: ${traps.passed}/${traps.total} | CEO ${traps.ceoPct}%\n`);

  let domainResults = [];
  if (!cfg.trapsOnly) {
    console.log("=== Phase 3: Dulith domain suites on live URL ===\n");
    for (const domain of DOMAINS) {
      console.log(`--- ${domain.id} ---`);
      domainResults.push(await runDomainSmoke(domain, cfg));
    }
  }

  const allPass =
    traps.passed === traps.total &&
    traps.ceoPct >= cfg.target &&
    domainResults.every((r) => r.personaPct >= cfg.target && r.ceoPct >= cfg.target);

  const summary = { cfg, planReview: review, traps, domainResults, allPass };
  const outPath = join(OUT_DIR, "summary.json");
  await writeFile(outPath, JSON.stringify(summary, null, 2));

  console.log("\n=== Live QA Summary ===");
  for (const d of domainResults) {
    console.log(`${d.domain}: ${d.passed}/${d.ran} (${d.personaPct}% / CEO ${d.ceoPct}%)`);
  }
  console.log(`Written → ${outPath}\n`);

  if (!allPass) {
    console.log("Gates not met — fix code, push to main, wait for Vercel deploy, re-run.");
    process.exit(1);
  }
  console.log("Live QA passed on production URL.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
