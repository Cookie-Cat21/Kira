#!/usr/bin/env node
/**
 * dulith-final-gate.mjs — Run all founder gates in one pass (local or production).
 *
 * Usage:
 *   node scripts/dulith-final-gate.mjs                    # production traps + plan review
 *   KIRA_API_URL=http://localhost:3107/api/chat node scripts/dulith-final-gate.mjs --with-local
 */
import { execFile } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { reviewDomainPlan, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";
import { DOMAINS } from "./dulith-domains.mjs";
import { runLiveRegression, LIVE_URL } from "./live-regression.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "test-results", "dulith-final-gate.json");

const withLocal = process.argv.includes("--with-local");
const liveUrl =
  process.env.KIRA_LIVE_URL ??
  process.env.KIRA_API_URL ??
  LIVE_URL;
const localUrl = process.env.KIRA_LOCAL_URL ?? "http://localhost:3107/api/chat";
const apiUrl = withLocal ? localUrl : liveUrl;

async function run(cmd, args) {
  await execFileAsync(cmd, args, { cwd: ROOT, stdio: "inherit", env: process.env });
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    apiUrl,
    phases: [],
    excitement: 0,
    verdict: "",
  };

  console.log("\n=== Dulith Final Gate — autonomous founder review ===\n");

  // Phase 1: Plan reviews (all domains)
  console.log("--- Phase 1: Plan approval (≥9/10 each) ---\n");
  let planFails = 0;
  for (const domain of DOMAINS) {
    const review = await reviewDomainPlan(domain);
    const ok = review.approved;
    if (!ok) planFails++;
    console.log(`${ok ? "✓" : "✗"} ${domain.id}: ${review.excitement}/10`);
    report.phases.push({
      phase: "plan",
      id: domain.id,
      excitement: review.excitement,
      pass: ok,
    });
  }
  if (planFails > 0) {
    report.verdict = `BLOCKED — ${planFails} plan(s) below ${APPROVAL_THRESHOLD}/10`;
    await writeReport(report);
    process.exit(1);
  }

  // Phase 2: Live regression traps on production (retry once on flake)
  console.log("\n--- Phase 2: Live regression traps (production) ---\n");
  let traps = await runLiveRegression(liveUrl);
  if (!traps.allPass) {
    console.log("Retrying traps once after 5s (MCP/Groq flake)...\n");
    await new Promise((r) => setTimeout(r, 5000));
    traps = await runLiveRegression(liveUrl);
  }
  for (const r of traps.results) {
    console.log(`${r.passed ? "✓" : "✗"} ${r.id} ${r.note}`);
  }
  report.phases.push({
    phase: "live_traps",
    passed: traps.passed,
    total: traps.total,
    personaPct: traps.personaPct,
    ceoPct: traps.ceoPct,
    pass: traps.allPass,
  });
  if (!traps.allPass) {
    report.verdict = `BLOCKED — live traps ${traps.passed}/${traps.total}`;
    await writeReport(report);
    process.exit(1);
  }

  // Phase 3: Dulith QA smoke (production URL for submission gate)
  console.log("\n--- Phase 3: Domain smoke suites (S–X) ---\n");
  process.env.KIRA_API_URL = liveUrl;
  try {
    await run(process.execPath, [
      join(__dirname, "dulith-qa-orchestrator.mjs"),
      "--smoke",
    ]);
    report.phases.push({ phase: "domain_smoke", pass: true });
  } catch {
    report.phases.push({ phase: "domain_smoke", pass: false });
    report.verdict = "BLOCKED — domain smoke failed";
    await writeReport(report);
    process.exit(1);
  }

  // Phase 4: Optional local-only extras
  if (withLocal) {
    console.log("\n--- Phase 4: Local judge dry-run + core suite ---\n");
    process.env.KIRA_API_URL = localUrl;
    try {
      await run(process.execPath, [join(__dirname, "judge-dry-run.mjs")]);
      report.phases.push({ phase: "judge_dry_run", pass: true });
    } catch {
      report.phases.push({ phase: "judge_dry_run", pass: false });
      report.verdict = "BLOCKED — judge dry-run failed";
      await writeReport(report);
      process.exit(1);
    }
    try {
      await run(process.execPath, [join(__dirname, "run-tests.mjs")]);
      report.phases.push({ phase: "core_suite", pass: true });
    } catch {
      report.phases.push({ phase: "core_suite", pass: false });
      report.verdict = "BLOCKED — core suite failed";
      await writeReport(report);
      process.exit(1);
    }
  }

  report.excitement = 10;
  report.verdict =
    "APPROVED — All Dulith gates passed. Ship the demo; record Path A from docs/JUDGE-DRY-RUN.md.";
  await writeReport(report);

  console.log("\n=== Dulith Final Verdict ===");
  console.log(`Excitement: ${report.excitement}/10`);
  console.log(report.verdict);
  console.log(`Written → ${OUT}\n`);
}

async function writeReport(report) {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
