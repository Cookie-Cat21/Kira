#!/usr/bin/env node
/**
 * dulith-breakup-supervisor.mjs — Dulith-supervised breakup/repair QA loop.
 *
 * 1. Plan review (breakup-repair domain ≥9/10)
 * 2. Unit tests (product filter)
 * 3. Generate 500 multilingual personas (en/si/ta)
 * 4. Run Group Y on production (concurrency 1 — Groq-safe)
 * 5. Triage failures → test-results/dulith-breakup/summary.json
 *
 * Usage:
 *   npm run test:dulith-breakup:supervisor
 *   npm run test:dulith-breakup:supervisor -- --smoke
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { reviewDomainPlan, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";
import { getDomain } from "./dulith-domains.mjs";
import { runLiveRegression, LIVE_URL } from "./live-regression.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "test-results", "dulith-breakup");

const smoke = process.argv.includes("--smoke");
const apiUrl = process.env.KIRA_API_URL ?? process.env.KIRA_LIVE_URL ?? LIVE_URL;

async function run(cmd, args, env = {}) {
  await execFileAsync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function tallyFailures(rows) {
  const byReason = new Map();
  for (const r of rows) {
    if (r.passed ?? r.evaluation?.passed) continue;
    for (const reason of r.reasons ?? r.evaluation?.reasons ?? ["unknown"]) {
      const key = reason.slice(0, 80);
      byReason.set(key, (byReason.get(key) ?? 0) + 1);
    }
  }
  return [...byReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { at: new Date().toISOString(), apiUrl, phases: [] };

  console.log("\n=== Dulith Breakup Supervisor ===\n");
  console.log(`API: ${apiUrl}`);
  console.log(`Mode: ${smoke ? "smoke (30)" : "full (500 personas en/si/ta)"}\n`);

  const domain = getDomain("breakup-repair");
  const review = await reviewDomainPlan(domain);
  console.log(`Plan ${domain.id}: ${review.excitement}/10 — ${review.approved ? "APPROVED" : "NEEDS REVISION"}`);
  report.phases.push({ phase: "plan", excitement: review.excitement, pass: review.approved });
  if (!review.approved) {
    console.error(`Plan below ${APPROVAL_THRESHOLD}/10 — revise ${domain.plan}`);
    process.exit(1);
  }

  console.log("\n--- Product filter unit tests ---\n");
  try {
    await run(process.execPath, [join(__dirname, "test-product-filter.mjs")]);
    report.phases.push({ phase: "product_filter", pass: true });
  } catch {
    report.phases.push({ phase: "product_filter", pass: false });
    process.exit(1);
  }

  console.log("\n--- Live Y traps ---\n");
  const traps = await runLiveRegression(apiUrl);
  for (const r of traps.results.filter((t) => t.id.startsWith("LIVE-Y"))) {
    console.log(`${r.passed ? "✓" : "✗"} ${r.id} ${r.note}`);
  }
  const yTrapsPass = traps.results.filter((t) => t.id.startsWith("LIVE-Y")).every((t) => t.passed);
  report.phases.push({ phase: "live_y_traps", pass: yTrapsPass, results: traps.results.filter((t) => t.id.startsWith("LIVE-Y")) });

  console.log("\n--- Generate + run Group Y ---\n");
  process.env.KIRA_API_URL = apiUrl;
  const orchArgs = [
    join(__dirname, "dulith-qa-orchestrator.mjs"),
    "--domain",
    "breakup-repair",
    smoke ? "--smoke" : "--full",
    "--skip-plans",
    "--target",
    "90",
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, orchArgs, {
      cwd: ROOT,
      env: { ...process.env, KIRA_API_URL: apiUrl },
      stdio: "inherit",
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`orchestrator exit ${code}`))));
  });

  let qaSummary = {};
  try {
    qaSummary = JSON.parse(await readFile(join(ROOT, "test-results", "dulith-qa", "summary.json"), "utf8"));
  } catch {
    /* optional */
  }

  const domainResult = qaSummary.results?.find((r) => r.domain === "breakup-repair");
  const failures = domainResult?.failures ?? [];
  report.phases.push({
    phase: "group_y",
    pass: domainResult?.summary?.allPass ?? false,
    personaPct: domainResult?.summary?.personaPct,
    ceoPct: domainResult?.summary?.ceoPct,
    ran: domainResult?.ran,
    topFailures: tallyFailures(failures),
  });

  const allPass = report.phases.every((p) => p.pass !== false);
  report.verdict = allPass
    ? "APPROVED — Breakup hand-deliver + bouquet QA passed under Dulith supervision."
    : "NEEDS FIX — See topFailures in summary.json";

  await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== Dulith Breakup Verdict ===");
  console.log(report.verdict);
  console.log(`Written → ${join(OUT, "summary.json")}\n`);

  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
