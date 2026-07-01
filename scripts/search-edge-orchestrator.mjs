#!/usr/bin/env node
/**
 * search-edge-orchestrator.mjs — Run Group S until persona + relevance + CEO ≥ target%.
 *
 * Usage:
 *   npx next dev --port 3107
 *   export KIRA_API_URL=http://localhost:3107/api/chat
 *   node scripts/dulith-plan-review.mjs
 *   node scripts/search-edge-orchestrator.mjs --smoke 20
 *   node scripts/search-edge-orchestrator.mjs --full --target 90
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertDevServerAvailable, API_URL } from "./test-runner.mjs";
import { reviewPlan, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "test-results", "search-edge");
const PLAN_PATH = join(ROOT, "docs", "SEARCH-ROUTING-PLAN.md");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f, d) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : d;
  };
  return {
    smoke: Number(get("--smoke", "0")),
    full: args.includes("--full"),
    target: Number(get("--target", "90")),
    delayMs: Number(get("--delay", "2200")),
    skipPlanReview: args.includes("--skip-plan"),
  };
}

async function ensureGenerated() {
  await execFileAsync(process.execPath, [join(__dirname, "generate-search-edge.mjs")], { cwd: ROOT });
}

async function loadGroupSIds() {
  const mod = await import(`./personas/generated-search-edge.mjs?t=${Date.now()}`);
  const ids = mod.GROUP_S.map((p) => p.id);
  return { ids, count: mod.SEARCH_EDGE_COUNT ?? ids.length };
}

async function runBatch(ids) {
  const outPath = join(OUT_DIR, `batch-${ids[0]}-${ids[ids.length - 1]}.json`);
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(__dirname, "test-personas.mjs"),
        "--group",
        "s",
        "--id",
        ids.join(","),
        "--concurrency",
        "1",
        "--out",
        outPath,
      ],
      { cwd: ROOT, env: { ...process.env, KIRA_API_URL: API_URL }, stdio: "inherit" }
    );
    child.on("close", async (code) => {
      try {
        resolve(JSON.parse(await readFile(outPath, "utf8")));
      } catch {
        reject(new Error(`batch exit ${code ?? "?"} — no results at ${outPath}`));
      }
    });
  });
}

function summarize(rows, target) {
  const total = rows.length;
  const passed = rows.filter((r) => r.evaluation?.passed).length;
  const errored = rows.filter((r) => r.evaluation?.isError).length;
  const relevanceFailed = rows.filter((r) =>
    r.evaluation?.reasons?.some((x) => /search relevance|off-category/i.test(x))
  ).length;
  const ceoRows = rows.filter((r) => r.evaluation?.ceoLens);
  const ceoPass = ceoRows.filter((r) => r.evaluation.ceoLens.pass).length;
  const personaPct = Math.round((passed / total) * 100);
  const ceoPct = ceoRows.length ? Math.round((ceoPass / ceoRows.length) * 100) : 0;
  const relevancePct = Math.round(((total - relevanceFailed) / total) * 100);

  return {
    total,
    passed,
    errored,
    personaPct,
    ceoPct,
    relevancePct,
    relevanceFailed,
    allPass: personaPct >= target && ceoPct >= target && relevancePct >= target,
  };
}

async function main() {
  const cfg = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  if (!cfg.skipPlanReview) {
    const planText = await readFile(PLAN_PATH, "utf8");
    const review = await reviewPlan(planText);
    console.log(`\nDulith plan review: ${review.excitement}/10 — ${review.verdict}\n`);
    if (!review.approved) {
      console.error(`Plan must score ≥${APPROVAL_THRESHOLD}/10 before running edge suite.`);
      process.exit(1);
    }
  }

  await assertDevServerAvailable();
  await ensureGenerated();
  const { ids, count } = await loadGroupSIds();
  const runIds = cfg.smoke > 0 ? ids.slice(0, cfg.smoke) : cfg.full ? ids : ids.slice(0, 40);

  console.log(`\nSearch edge orchestrator — ${runIds.length}/${count} personas, target ${cfg.target}%\n`);

  const chunk = 25;
  const allRows = [];
  for (let i = 0; i < runIds.length; i += chunk) {
    const batch = runIds.slice(i, i + chunk);
    console.log(`\n--- Batch ${batch[0]}..${batch[batch.length - 1]} ---\n`);
    const rows = await runBatch(batch);
    allRows.push(...rows);
    if (i + chunk < runIds.length) {
      await new Promise((r) => setTimeout(r, cfg.delayMs));
    }
  }

  const summary = summarize(allRows, cfg.target);
  const outPath = join(OUT_DIR, "summary.json");
  await writeFile(
    outPath,
    JSON.stringify({ cfg, summary, failures: allRows.filter((r) => !r.evaluation?.passed).slice(0, 30) }, null, 2)
  );

  console.log("\n=== Search Edge Summary ===");
  console.log(`Persona pass:  ${summary.passed}/${summary.total} (${summary.personaPct}%)`);
  console.log(`CEO lens ≥90:  ${summary.ceoPct}%`);
  console.log(`Relevance:     ${summary.relevancePct}% (${summary.relevanceFailed} failures)`);
  console.log(`Written → ${outPath}\n`);

  if (!summary.allPass) {
    console.log("Gates not met — triage failures in summary.json and fix routing/filters/copy.");
    process.exit(1);
  }
  console.log("All gates passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
