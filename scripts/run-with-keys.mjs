#!/usr/bin/env node
/**
 * run-with-keys.mjs
 * Batch test runner — rotates GROQ_API_KEY / _2 / _3 from .env.local across suites.
 *
 * Usage:
 *   npm run test:batch
 *   node scripts/run-with-keys.mjs
 *
 * Requires Kira dev server (see docs/TESTING.md). Never logs API key values.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const PERSONAS_PATH = join(__dirname, "test-personas.mjs");
const RESULTS_DIR = join(ROOT, "test-results");
const RUN_TESTS_PATH = join(RESULTS_DIR, "results.json");
const PERSONA_RESULTS_PATH = join(RESULTS_DIR, "persona-results.json");
const BATCH_SUMMARY_PATH = join(RESULTS_DIR, "batch-summary.json");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @returns {Record<string, string>} */
function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    const unquoted =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
    vars[key] = unquoted;
  }
  return vars;
}

/** @returns {Array<{ label: string, value: string }>} */
function collectGroqKeys(vars) {
  const slots = [
    ["GROQ_API_KEY", vars.GROQ_API_KEY],
    ["GROQ_API_KEY_2", vars.GROQ_API_KEY_2],
    ["GROQ_API_KEY_3", vars.GROQ_API_KEY_3],
  ];
  return slots
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([label, value]) => ({ label, value }));
}

async function groupGExists() {
  try {
    const src = await readFile(PERSONAS_PATH, "utf8");
    return /\bGROUP_G\b/.test(src) && /\bG:\s*GROUP_G\b/.test(src);
  } catch {
    return false;
  }
}

function runNode(scriptRel, args, envExtra) {
  const scriptPath = join(__dirname, scriptRel);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...envExtra },
      stdio: "inherit",
    });
    child.on("error", (err) => resolve({ exitCode: 1, spawnError: err.message }));
    child.on("close", (code) => resolve({ exitCode: code ?? 1, spawnError: null }));
  });
}

async function readJsonSafe(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function summarizeRunTests(payload) {
  if (!payload) return { passed: 0, failed: 0, errs: 0, total: 0 };
  const total = payload.results?.length ?? 0;
  return {
    passed: payload.passed ?? 0,
    failed: payload.failed ?? 0,
    errs: payload.errs ?? 0,
    total,
  };
}

function summarizePersonas(rows) {
  if (!Array.isArray(rows)) return { passed: 0, failed: 0, errored: 0, total: 0 };
  const passed = rows.filter((r) => r.passed).length;
  const errored = rows.filter((r) => r.isError).length;
  return {
    passed,
    failed: rows.length - passed - errored,
    errored,
    total: rows.length,
  };
}

function mergeRunTests(batches) {
  const byId = new Map();
  for (const batch of batches) {
    for (const row of batch.runTests?.results ?? []) {
      const prev = byId.get(row.id);
      if (!prev || row.passed || (!prev.passed && !row.isErr)) byId.set(row.id, row);
    }
  }
  const results = [...byId.values()].sort((a, b) => a.id - b.id);
  const passed = results.filter((r) => r.passed).length;
  const errs = results.filter((r) => r.isErr).length;
  return { passed, failed: results.length - passed - errs, errs, total: results.length, results };
}

function mergePersonas(batches) {
  const byId = new Map();
  for (const batch of batches) {
    for (const row of batch.personas?.results ?? []) {
      const prev = byId.get(row.id);
      if (!prev || row.passed || (prev.isError && !row.isError)) byId.set(row.id, row);
    }
  }
  const results = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { ...summarizePersonas(results), results };
}

/** Rewrite GROQ_API_KEY in .env.local content; never logs key values. */
function envContentWithKey(originalContent, keyValue) {
  const lines = originalContent.split("\n");
  let replaced = false;
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("GROQ_API_KEY=") && !trimmed.startsWith("GROQ_API_KEY_")) {
      replaced = true;
      return `GROQ_API_KEY=${keyValue}`;
    }
    return line;
  });
  if (!replaced) out.push(`GROQ_API_KEY=${keyValue}`);
  return out.join("\n");
}

async function main() {
  console.log(`\n${c.bold}${c.cyan}Kira batch test runner (multi-key)${c.reset}\n`);

  let envContent = "";
  try {
    envContent = await readFile(ENV_PATH, "utf8");
  } catch {
    console.error(`${c.red}Missing ${ENV_PATH} — create it from .env.example${c.reset}`);
    process.exit(1);
  }

  const vars = parseEnvFile(envContent);
  const keys = collectGroqKeys(vars);
  if (keys.length === 0) {
    console.error(`${c.red}No GROQ_API_KEY / GROQ_API_KEY_2 / GROQ_API_KEY_3 found in .env.local${c.reset}`);
    process.exit(1);
  }

  const hasGroupG = await groupGExists();
  if (!hasGroupG) {
    console.log(`${c.yellow}Group G not defined in test-personas.mjs — persona group step will be skipped.${c.reset}`);
  }

  console.log(`${c.dim}Using ${keys.length} Groq key slot(s): ${keys.map((k) => k.label).join(", ")}${c.reset}`);
  console.log(`${c.dim}Note: restart dev server after each batch if /api/chat must pick up rotated keys.${c.reset}\n`);

  const batches = [];
  let judgeBest = { passed: 0, total: 10, allPassed: true };

  try {
    for (let i = 0; i < keys.length; i++) {
      const { label, value: keyValue } = keys[i];
      console.log(`${c.bold}${c.cyan}── Batch ${i + 1}/${keys.length}: ${label} ──${c.reset}\n`);

      await writeFile(ENV_PATH, envContentWithKey(envContent, keyValue));
      const childEnv = { GROQ_API_KEY: keyValue };

      console.log(`${c.dim}→ node scripts/run-tests.mjs${c.reset}`);
      const runTests = await runNode("run-tests.mjs", [], childEnv);
      await sleep(500);
      const runTestsPayload = await readJsonSafe(RUN_TESTS_PATH);

      console.log(`\n${c.dim}→ node scripts/judge-dry-run.mjs${c.reset}`);
      const judge = await runNode("judge-dry-run.mjs", [], childEnv);
      await sleep(500);

      let personas = { skipped: true, exitCode: 0, summary: null, results: [] };
      if (hasGroupG) {
        console.log(`\n${c.dim}→ node scripts/test-personas.mjs --group g --concurrency 1${c.reset}`);
        const personaRun = await runNode("test-personas.mjs", ["--group", "g", "--concurrency", "1"], childEnv);
        const personaRows = await readJsonSafe(PERSONA_RESULTS_PATH);
        personas = {
          skipped: false,
          exitCode: personaRun.exitCode,
          summary: summarizePersonas(personaRows),
          results: personaRows ?? [],
        };
      }

      const batch = {
        keyIndex: i + 1,
        keyLabel: label,
        runTests: {
          exitCode: runTests.exitCode,
          ...summarizeRunTests(runTestsPayload),
          results: runTestsPayload?.results ?? [],
        },
        judgeDryRun: {
          exitCode: judge.exitCode,
          passed: judge.exitCode === 0 ? 10 : null,
          total: 10,
        },
        personas,
      };
      batches.push(batch);

      if (judge.exitCode === 0) judgeBest = { passed: 10, total: 10, allPassed: true };
      else judgeBest.allPassed = false;

      console.log("");
    }
  } finally {
    await writeFile(ENV_PATH, envContent);
  }

  const merged = {
    runTests: mergeRunTests(batches),
    personas: hasGroupG ? mergePersonas(batches) : { skipped: true },
    judgeDryRun: judgeBest,
  };

  let errRerun = { attempted: [], before: 0, after: 0, results: [] };
  if (hasGroupG) {
    const errIds = (merged.personas.results ?? [])
      .filter((r) => r.isError)
      .map((r) => r.id);

    if (errIds.length > 0) {
      console.log(`${c.bold}${c.yellow}── Re-running ${errIds.length} ERR persona(s) ──${c.reset}\n`);
      const firstKey = keys[0].value;
      const rerun = await runNode(
        "test-personas.mjs",
        ["--id", errIds.join(","), "--concurrency", "1"],
        { GROQ_API_KEY: firstKey }
      );
      const rerunRows = (await readJsonSafe(PERSONA_RESULTS_PATH)) ?? [];
      const rerunById = new Map(rerunRows.map((r) => [r.id, r]));

      const updated = (merged.personas.results ?? []).map((row) => rerunById.get(row.id) ?? row);
      merged.personas = { ...summarizePersonas(updated), results: updated };

      errRerun = {
        attempted: errIds,
        before: errIds.length,
        after: updated.filter((r) => errIds.includes(r.id) && r.isError).length,
        exitCode: rerun.exitCode,
        results: errIds.map((id) => rerunById.get(id)).filter(Boolean),
      };
    }
  }

  const summary = {
    runAt: new Date().toISOString(),
    keysUsed: keys.length,
    keyLabels: keys.map((k) => k.label),
    groupG: hasGroupG,
    batches,
    merged,
    errRerun,
  };

  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(BATCH_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`${c.bold}${"─".repeat(60)}${c.reset}`);
  console.log(`${c.bold}Batch summary${c.reset}`);
  console.log(`  Core tests:  ${merged.runTests.passed}/${merged.runTests.total} passed`);
  if (hasGroupG) {
    console.log(
      `  Group G:     ${merged.personas.passed}/${merged.personas.total} passed` +
        (merged.personas.errored ? ` (${merged.personas.errored} ERR)` : "")
    );
  }
  console.log(`  Judge dry:   ${judgeBest.allPassed ? "10/10" : "see logs"}`);
  if (errRerun.attempted.length) {
    console.log(`  ERR re-run:  ${errRerun.before - errRerun.after}/${errRerun.before} recovered`);
  }
  console.log(`${c.dim}  Wrote: ${BATCH_SUMMARY_PATH}${c.reset}\n`);

  const anyFail =
    merged.runTests.failed > 0 ||
    merged.runTests.errs > 0 ||
    !judgeBest.allPassed ||
    (hasGroupG && merged.personas.failed > 0);

  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
