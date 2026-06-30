#!/usr/bin/env node
/**
 * ceo-500-orchestrator.mjs — Run 500 persona E2E with CEO scoring gate (target ≥90%).
 *
 * Usage:
 *   npx next dev --port 3107
 *   export KIRA_API_URL=http://localhost:3107/api/chat
 *   node scripts/ceo-500-orchestrator.mjs --smoke 50
 *   node scripts/ceo-500-orchestrator.mjs --full
 *   node scripts/ceo-500-orchestrator.mjs --shard 1/5
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertDevServerAvailable, API_URL } from "./test-runner.mjs";
import { ceoPassAt90, ceoScorePercent } from "./ceo-lens.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "test-results", "ceo-500");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f, d) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : d;
  };
  let shard = null;
  const shardIdx = args.indexOf("--shard");
  if (shardIdx >= 0) {
    const [a, b] = args[shardIdx + 1].split("/").map(Number);
    shard = { index: a, total: b };
  }
  return {
    smoke: Number(get("--smoke", "0")),
    full: args.includes("--full"),
    shard,
    target: Number(get("--target", "90")),
    llmReview: args.includes("--llm"),
    delayMs: Number(get("--delay", "1200")),
  };
}

function allPersonaIds() {
  throw new Error("call loadPersonaIds()");
}

async function loadPersonaIds() {
  await runGenerate();
  const { stdout } = await execFileAsync(process.execPath, [join(__dirname, "list-persona-ids.mjs")], {
    cwd: ROOT,
  });
  return JSON.parse(stdout.trim());
}

function pickIdsWithAll(cfg, all) {
  if (cfg.smoke > 0) {
    const smokeSet = new Set([
      ...all.filter((id) => /^[FMG]/.test(id)).slice(0, 20),
      ...all.filter((id) => /^[HIJKLM]/.test(id)).slice(0, Math.max(0, cfg.smoke - 20)),
    ]);
    return all.filter((id) => smokeSet.has(id)).slice(0, cfg.smoke);
  }
  if (cfg.shard) {
    const chunk = Math.ceil(all.length / cfg.shard.total);
    const start = (cfg.shard.index - 1) * chunk;
    return all.slice(start, start + chunk);
  }
  if (cfg.full) return all;
  return all.slice(0, 50);
}

async function runGenerate() {
  await execFileAsync(process.execPath, [join(__dirname, "generate-personas.mjs")], { cwd: ROOT });
}

async function runPersonaBatch(ids) {
  const outPath = join(OUT_DIR, `batch-${ids[0]}-${ids[ids.length - 1]}.json`);
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(__dirname, "test-personas.mjs"), "--id", ids.join(","), "--concurrency", "1", "--out", outPath],
      { cwd: ROOT, env: { ...process.env, KIRA_API_URL: API_URL }, stdio: "inherit" }
    );
    child.on("close", async (code) => {
      try {
        resolve(JSON.parse(await readFile(outPath, "utf8")));
      } catch {
        reject(new Error(`persona batch exit ${code ?? "unknown"} — no results at ${outPath}`));
      }
    });
  });
}

function clusterFailures(rows, target) {
  const clusters = {};
  for (const r of rows) {
    if (r.isError || (r.passed && ceoPassAt90(r.ceoLens))) continue;
    const pct = ceoScorePercent(r.ceoLens);
    if (r.passed && pct >= target) continue;
    const flags = r.ceoLens?.flags ?? [];
    const key =
      flags.includes("tool_markup_leak")
        ? "tool_markup_leak"
        : flags.includes("family_unsafe_carousel")
          ? "family_unsafe_carousel"
          : flags.includes("generic_carousel_copy")
            ? "generic_carousel_copy"
            : flags.includes("premature_products")
              ? "premature_products"
              : !r.passed
                ? "persona_check_fail"
                : "low_excitement";
    clusters[key] = clusters[key] ?? [];
    clusters[key].push({
      id: r.id,
      msg: r.msg,
      score: pct,
      reasons: r.reasons,
      verdict: r.ceoLens?.verdict,
    });
  }
  return clusters;
}

async function main() {
  const cfg = parseArgs();
  await assertDevServerAvailable();
  await mkdir(OUT_DIR, { recursive: true });

  const allIds = await loadPersonaIds();
  const ids = pickIdsWithAll(cfg, allIds);
  console.log(`\nCEO-500 orchestrator: ${ids.length} personas (target CEO ≥${cfg.target}%)\n`);

  const results = [];
  const BATCH = 25;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${chunk[0]} … ${chunk[chunk.length - 1]}`);
    const batch = await runPersonaBatch(chunk);
    results.push(...batch);
    if (cfg.delayMs) await new Promise((r) => setTimeout(r, cfg.delayMs));
  }
  console.log("\n");

  const genuine = results.filter((r) => !r.isError);
  const personaPassPct = genuine.length
    ? Math.round((genuine.filter((r) => r.passed).length / genuine.length) * 100)
    : 0;
  const ceoPassPct = genuine.length
    ? Math.round((genuine.filter((r) => ceoPassAt90(r.ceoLens) && r.passed).length / genuine.length) * 100)
    : 0;
  const avgCeo = genuine.length
    ? Math.round(genuine.reduce((a, r) => a + ceoScorePercent(r.ceoLens), 0) / genuine.length)
    : 0;

  const summary = {
    at: new Date().toISOString(),
    api: API_URL,
    count: results.length,
    personaPassPct,
    ceoPassPct,
    avgCeoScore: avgCeo,
    target: cfg.target,
    passGate: personaPassPct >= cfg.target && ceoPassPct >= cfg.target,
    clusters: clusterFailures(results, cfg.target),
  };

  const mergedPath = join(OUT_DIR, "results.json");
  await writeFile(mergedPath, `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(join(OUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(OUT_DIR, "triage.json"), `${JSON.stringify(summary.clusters, null, 2)}\n`);

  console.log(`Persona pass: ${personaPassPct}% | CEO pass: ${ceoPassPct}% | Avg CEO: ${avgCeo}/100`);
  console.log(`Wrote ${mergedPath}`);

  if (cfg.llmReview && summary.clusters && Object.keys(summary.clusters).length) {
    console.log("Running LLM CEO review on below-threshold rows…");
    await execFileAsync(
      process.execPath,
      [join(__dirname, "ceo-score-all.mjs"), "--from", mergedPath, "--llm", "--below", String(cfg.target)],
      { cwd: ROOT, stdio: "inherit" }
    );
  }

  process.exit(summary.passGate ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
