#!/usr/bin/env node
/**
 * dulith-multilingual-supervisor.mjs — Dulith-supervised Group Z (2500 personas).
 *
 * Phase 0: Plan gate (≥9/10)
 * Phase 1: Generate 2500 personas
 * Phase 2: Smoke 125 (25 per language mode)
 * Phase 3–7: Full blocks en → si → ta → singlish → tanglish (500 each, ≥90%/≥90%)
 *
 * Usage:
 *   npm run test:z-2500:supervisor
 *   npm run test:z-2500:supervisor -- --smoke-only
 *   npm run test:z-block -- --lang si
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { reviewDomainPlan, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";
import { getDomain } from "./dulith-domains.mjs";
import { LIVE_URL } from "./live-regression.mjs";
import { LANG_BLOCKS } from "./lib/language-mode.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "test-results", "dulith-multilingual");

const smokeOnly = process.argv.includes("--smoke-only");
const langArg = (() => {
  const i = process.argv.indexOf("--lang");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const apiUrl = process.env.KIRA_API_URL ?? process.env.KIRA_LIVE_URL ?? LIVE_URL;
const TARGET = 90;
const BLOCK_SIZE = 500;

async function run(cmd, args) {
  await execFileAsync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, KIRA_API_URL: apiUrl },
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

async function runOrchestrator({ smoke, lang, full }) {
  const args = [
    join(__dirname, "dulith-qa-orchestrator.mjs"),
    "--domain",
    "multilingual-2500",
    "--skip-plans",
    "--target",
    String(TARGET),
  ];
  if (smoke) args.push("--smoke");
  if (full) args.push("--full");
  if (lang) args.push("--lang", lang);

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, KIRA_API_URL: apiUrl },
      stdio: "inherit",
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`orchestrator exit ${code}`))));
  });

  const summary = JSON.parse(await readFile(join(ROOT, "test-results", "dulith-qa", "summary.json"), "utf8"));
  return summary.results?.find((r) => r.domain === "multilingual-2500");
}

function blockPass(result, required = BLOCK_SIZE) {
  const s = result?.summary ?? {};
  return (
    (result?.ran ?? 0) >= required &&
    (s.personaPct ?? 0) >= TARGET &&
    (s.ceoPct ?? 0) >= TARGET
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    at: new Date().toISOString(),
    apiUrl,
    target: { personaPct: TARGET, ceoPct: TARGET, perBlock: BLOCK_SIZE, total: 2500 },
    phases: [],
    blocks: [],
    fixLog: [],
  };

  console.log("\n=== Dulith Multilingual 2500 Supervisor ===\n");
  console.log(`API: ${apiUrl}\n`);

  const domain = getDomain("multilingual-2500");
  const review = await reviewDomainPlan(domain);
  console.log(`Plan ${domain.id}: ${review.excitement}/10 — ${review.approved ? "APPROVED" : "NEEDS REVISION"}`);
  report.phases.push({ phase: "plan", excitement: review.excitement, pass: review.approved });
  if (!review.approved) {
    console.error(`Plan below ${APPROVAL_THRESHOLD}/10 — revise ${domain.plan}`);
    process.exit(1);
  }

  console.log("\n--- Generate Group Z ---\n");
  await run(process.execPath, [join(__dirname, "generate-multilingual-2500.mjs")]);
  report.phases.push({ phase: "generate", pass: true, count: 2500 });

  if (langArg) {
    console.log(`\n--- Single block: ${langArg} ---\n`);
    const blockResult = await runOrchestrator({ lang: langArg, full: true });
    const ok = blockPass(blockResult);
    report.blocks.push({ mode: langArg, ...blockResult?.summary, ran: blockResult?.ran, pass: ok, topFailures: tallyFailures(blockResult?.failures ?? []) });
    report.verdict = ok
      ? `APPROVED — ${langArg} block met Dulith standard (${blockResult?.summary?.personaPct}% / ${blockResult?.summary?.ceoPct}%).`
      : `NEEDS FIX — ${langArg} block below ${TARGET}%.`;
    await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));
    console.log("\n" + report.verdict);
    if (!ok) process.exit(1);
    return;
  }

  console.log("\n--- Smoke: 125 cases (25 per mode) ---\n");
  const smokeResult = await runOrchestrator({ smoke: true });
  const smokeOk = blockPass(smokeResult, smokeResult?.ran ?? 125);
  report.phases.push({
    phase: "smoke",
    pass: smokeOk,
    ran: smokeResult?.ran,
    personaPct: smokeResult?.summary?.personaPct,
    ceoPct: smokeResult?.summary?.ceoPct,
    topFailures: tallyFailures(smokeResult?.failures ?? []),
  });
  if (!smokeOk) {
    report.verdict = `BLOCKED — smoke failed (${smokeResult?.summary?.personaPct}% persona / ${smokeResult?.summary?.ceoPct}% CEO). Fix before full 2500.`;
    await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));
    console.error("\n" + report.verdict);
    process.exit(1);
  }

  if (smokeOnly) {
    report.verdict = "SMOKE PASSED — run without --smoke-only for full 2500 block gates.";
    await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));
    console.log("\n" + report.verdict);
    return;
  }

  const modes = LANG_BLOCKS.map((b) => b.mode);
  let allBlocksOk = true;
  for (const mode of modes) {
    console.log(`\n========== Block: ${mode} (500 cases) ==========\n`);
    const blockResult = await runOrchestrator({ lang: mode, full: true });
    const ok = blockPass(blockResult);
    if (!ok) allBlocksOk = false;
    report.blocks.push({
      mode,
      ran: blockResult?.ran,
      personaPct: blockResult?.summary?.personaPct,
      ceoPct: blockResult?.summary?.ceoPct,
      pass: ok,
      topFailures: tallyFailures(blockResult?.failures ?? []),
    });
    console.log(`${ok ? "✓" : "✗"} ${mode}: ${blockResult?.summary?.passed}/${blockResult?.ran} (${blockResult?.summary?.personaPct}%) CEO ${blockResult?.summary?.ceoPct}%`);
    if (!ok) {
      report.verdict = `NEEDS FIX — ${mode} block below Dulith standard. Fix cluster and re-run: npm run test:z-block -- --lang ${mode}`;
      await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));
      process.exit(1);
    }
  }

  const aggPersona = Math.round(report.blocks.reduce((s, b) => s + (b.personaPct ?? 0), 0) / report.blocks.length);
  const aggCeo = Math.round(report.blocks.reduce((s, b) => s + (b.ceoPct ?? 0), 0) / report.blocks.length);

  report.phases.push({ phase: "aggregate", pass: allBlocksOk, personaPct: aggPersona, ceoPct: aggCeo, total: 2500 });
  report.verdict = allBlocksOk
    ? `APPROVED — Dulith standard met on all 2,500 cases (5×500 blocks). Aggregate ${aggPersona}% persona / ${aggCeo}% CEO.`
    : "NEEDS FIX — see blocks in summary.json";

  await writeFile(join(OUT, "summary.json"), JSON.stringify(report, null, 2));
  console.log("\n=== Dulith Multilingual Verdict ===");
  console.log(report.verdict);
  console.log(`Written → ${join(OUT, "summary.json")}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
