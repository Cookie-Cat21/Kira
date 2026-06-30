#!/usr/bin/env node
/**
 * agent-loop.mjs — CEO-scored continuous QA loop for Kira.
 *
 * Runs judge dry-run, core suite (periodic), persona batches, and random edge
 * scenarios until duration elapses or pass-rate + CEO score targets are met.
 *
 * Usage:
 *   npx next dev --port 3107
 *   export KIRA_API_URL=http://localhost:3107/api/chat
 *   node scripts/agent-loop.mjs
 *   node scripts/agent-loop.mjs --duration 90 --batch 25 --target-pass 93 --target-ceo 8
 *
 * Output: test-results/agent-loop/iteration-NNN.json + summary.json
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertDevServerAvailable, sendTestCase, API_URL } from "./test-runner.mjs";
import { runCheck } from "./evaluate.mjs";
import { scoreCeoLens } from "./ceo-lens.mjs";
import { scoreFounderLens } from "./founder-lens.mjs";
import { applyAgentFixes } from "./agent-auto-fix.mjs";
import { FIXED_EDGE, pickFixedEdge, randomEdgeBatch } from "./edge-personas.mjs";
import {
  GROUPS,
  runPersona,
  evaluateChecks,
} from "./test-personas.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "test-results", "agent-loop");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const SENTINEL_RE =
  /I'?m a bit slammed|thinking servers|ran out of time|trouble reaching Kapruka|something went wrong on my end|ටික(ක්)? busy|கொஞ்சம் busy/i;
const HONEST_EMPTY_RE =
  /couldn'?t find|nothing in stock|no products in stock|not in stock|try a different|different category/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, def) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : def;
  };
  return {
    durationMin: Number(get("--duration", "90")),
    batchSize: Number(get("--batch", "25")),
    edgeSize: Number(get("--edge", "10")),
    targetPass: Number(get("--target-pass", "93")),
    targetCeo: Number(get("--target-ceo", "8")),
    coreEvery: Number(get("--core-every", "3")),
    delayMs: Number(get("--delay", "1200")),
  };
}

function shuffle(arr, seed) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function flattenPersonas() {
  const out = [];
  for (const [g, list] of Object.entries(GROUPS)) {
    for (const p of list) out.push({ group: g, persona: p });
  }
  return out;
}

function productsOf(events) {
  const e = events?.find((x) => x.t === "products");
  return Array.isArray(e?.v) ? e.v : null;
}

function applyEdgeToken(token, arg, events, text) {
  const products = productsOf(events);
  switch (token) {
    case "productsOrHonestEmpty":
      return {
        pass: (!!products && products.length > 0) || HONEST_EMPTY_RE.test(text),
        reason: "Expected real products OR honest empty message",
      };
    case "noFlowerJunk": {
      if (!products?.length) return { pass: true, reason: "" };
      const junk = products.filter((p) =>
        /\b(greeting\s*card|key\s*tag|keytag|key\s*chain|crochet|everbloom|mini\s*flora|flora\s*bunch|artificial)\b/i.test(
          `${p.name ?? ""} ${p.category ?? ""}`
        )
      );
      return {
        pass: junk.length === 0,
        reason: junk.length ? `Non-flower junk in carousel: ${junk.map((p) => p.name).join(", ")}` : "",
      };
    }
    case "noFamilyUnsafe": {
      if (!products?.length) return { pass: true, reason: "" };
      const unsafe = products.filter((p) =>
        /\b(condom|condoms|contraceptive|lubricant|sex\s*toy|adult\s*toy|vibrat|dildo|lingerie|intimate\s*wear|bondage|fetish|erotic|viagra|cialis)\b/i.test(
          `${p.name ?? ""} ${p.category ?? ""}`
        )
      );
      return {
        pass: unsafe.length === 0,
        reason: unsafe.length ? `Adult/intimate items in carousel: ${unsafe.map((p) => p.name).join(", ")}` : "",
      };
    }
    case "eitherProductsOrAsk": {
      const hasProds = !!products && products.length > 0;
      const asks = /\?/.test(text);
      return {
        pass: hasProds || asks || HONEST_EMPTY_RE.test(text),
        reason: "Expected products, clarifying question, or honest empty",
      };
    }
    case "text":
      return { pass: arg.test(text), reason: `Expected text match ${arg}` };
    case "noText":
      return { pass: !arg.test(text), reason: `Unexpected text match ${arg}` };
    default:
      return runCheck({ fn: token }, events, text);
  }
}

function evaluateEdge(persona, result) {
  if (result?.error) return { passed: false, isError: true, reasons: [result.error] };
  if (SENTINEL_RE.test(result?.responseText ?? ""))
    return { passed: false, isError: true, reasons: ["Rate-limit/connection fallback"] };
  const { responseText, events } = result;
  const reasons = [];
  if (!responseText?.trim()) reasons.push("Empty response");
  for (const chk of persona.checks ?? []) {
    const [token, arg] = Array.isArray(chk) ? chk : [chk];
    const r = applyEdgeToken(token, arg, events, responseText);
    if (!r.pass) reasons.push(r.reason);
  }
  if (/flower|rose|send|deliver|angry|wife|gf/i.test(persona.msg ?? "")) {
    const fl = scoreFounderLens(responseText, events, persona);
    if (!fl.pass && !reasons.length) reasons.push(`founder-lens: ${fl.flags.join(", ")}`);
  }
  return { passed: reasons.length === 0, isError: false, reasons };
}

async function runEdgePersona(persona) {
  const messages = persona.history ?? [{ role: "user", content: persona.msg }];
  const request = {
    messages,
    cart: [],
    language: persona.language ?? "en",
    ...(persona.lastOrder
      ? {
          lastOrder: {
            orderRef: "KP-LOOP-001",
            placedAt: Date.now(),
            items: [{ product: { id: "loop-1", name: "Loop Test Chocolate", price: 1500, currency: "LKR" }, quantity: 1 }],
          },
        }
      : {}),
  };
  let result = await sendTestCase({ request, checks: [] });
  let evaluation = evaluateEdge(persona, result);
  if (evaluation.isError) {
    await sleep(4000);
    result = await sendTestCase({ request, checks: [] });
    evaluation = evaluateEdge(persona, result);
  }
  return { persona, result, evaluation, group: "X" };
}

async function runSubprocess(script, extraArgs = []) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [join(__dirname, script), ...extraArgs],
      {
        cwd: ROOT,
        env: { ...process.env, KIRA_API_URL: API_URL },
        maxBuffer: 20 * 1024 * 1024,
        timeout: 600_000,
      }
    );
    const combined = `${stdout}\n${stderr}`;
    const passMatch = combined.match(/(\d+)\/(\d+) passed|Judge dry-run: (\d+)\/(\d+)/);
    return { ok: true, output: combined.slice(-2000), passMatch };
  } catch (err) {
    return { ok: false, output: (err.stdout ?? "") + (err.stderr ?? ""), error: err.message };
  }
}

function pickBatch(allPersonas, iteration, batchSize) {
  const shuffled = shuffle(allPersonas, iteration * 7919 + 42);
  return shuffled.slice(0, batchSize);
}

async function runIteration(cfg, iteration, allPersonas, state) {
  const started = Date.now();
  const results = [];
  console.log(`\n${c.bold}${c.cyan}══ Iteration ${iteration} ══${c.reset}`);

  // Judge dry-run every iteration
  console.log(`${c.dim}Running judge dry-run...${c.reset}`);
  const judge = await runSubprocess("judge-dry-run.mjs");
  const judgeOk = judge.output.includes("10/10 passed");
  console.log(judgeOk ? `${c.green}✓ Judge 10/10${c.reset}` : `${c.yellow}~ Judge issues — see log${c.reset}`);

  // Core suite periodically
  let coreSummary = null;
  if (iteration === 1 || iteration % cfg.coreEvery === 0) {
    console.log(`${c.dim}Running core suite (68 tests)...${c.reset}`);
    const core = await runSubprocess("run-tests.mjs");
    const m = core.output.match(/Passed: (\d+)[\s\S]*Failed: (\d+)[\s\S]*Errors: (\d+)/);
    coreSummary = m ? { passed: +m[1], failed: +m[2], errs: +m[3] } : { passed: 0, failed: 0, errs: 0, raw: core.output.slice(-500) };
    console.log(
      `${coreSummary.passed >= 65 ? c.green : c.yellow}Core: ${coreSummary.passed}/68 pass, ${coreSummary.failed} fail, ${coreSummary.errs} err${c.reset}`
    );
  }

  // Persona batch
  const batch = pickBatch(allPersonas, iteration, cfg.batchSize);
  const fixedEdge = pickFixedEdge(Math.min(5, FIXED_EDGE.length), iteration);
  const randomEdge = randomEdgeBatch(cfg.edgeSize, Date.now() + iteration * 997);
  const edgeCases = [...fixedEdge, ...randomEdge];

  console.log(`${c.dim}Personas: ${batch.length} | Edge: ${edgeCases.length}${c.reset}`);

  for (const { group, persona } of batch) {
    const run = await runPersona(persona, group);
    results.push({
      id: persona.id,
      group,
      msg: persona.msg,
      note: persona.note,
      passed: run.evaluation.passed,
      isError: !!run.evaluation.isError,
      reasons: run.evaluation.reasons ?? [],
      ceo: run.evaluation.ceoLens ?? null,
      response: run.result?.responseText?.slice(0, 200) ?? "",
    });
    if (cfg.delayMs) await sleep(cfg.delayMs);
  }

  for (const persona of edgeCases) {
    const run = await runEdgePersona(persona);
    const ceo = run.evaluation.isError
      ? null
      : scoreCeoLens("C", persona, run.result?.responseText ?? "", run.result?.events ?? [], run.evaluation.passed);
    results.push({
      id: persona.id,
      group: "X",
      msg: persona.msg,
      note: persona.note,
      passed: run.evaluation.passed,
      isError: !!run.evaluation.isError,
      reasons: run.evaluation.reasons ?? [],
      ceo,
      response: run.result?.responseText?.slice(0, 200) ?? "",
    });
    if (cfg.delayMs) await sleep(cfg.delayMs);
  }

  const genuine = results.filter((r) => !r.isError);
  const passed = genuine.filter((r) => r.passed).length;
  const errored = results.filter((r) => r.isError).length;
  const passPct = genuine.length ? Math.round((passed / genuine.length) * 100) : 0;

  const ceoScores = results.filter((r) => r.ceo?.score != null).map((r) => r.ceo.score);
  const avgCeo = ceoScores.length ? ceoScores.reduce((a, b) => a + b, 0) / ceoScores.length : 0;
  const lowCeo = results.filter((r) => r.ceo && r.ceo.score < cfg.targetCeo && !r.passed);

  const failures = results.filter((r) => !r.passed && !r.isError);
  const fixes = failures.length ? await applyAgentFixes(failures) : [];

  const report = {
    iteration,
    at: new Date().toISOString(),
    durationMs: Date.now() - started,
    judgeOk,
    coreSummary,
    stats: {
      total: results.length,
      passed,
      failed: failures.length,
      errored,
      passPct,
      avgCeo: Math.round(avgCeo * 10) / 10,
    },
    failures: failures.map((f) => ({
      id: f.id,
      group: f.group,
      msg: f.msg,
      reasons: f.reasons,
      ceo: f.ceo,
    })),
    fixesApplied: fixes,
    results,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const iterPath = join(OUT_DIR, `iteration-${String(iteration).padStart(3, "0")}.json`);
  await writeFile(iterPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `${passPct >= cfg.targetPass ? c.green : c.yellow}${c.bold}Batch: ${passed}/${genuine.length} passed (${passPct}%) | avg CEO ${avgCeo.toFixed(1)}/10 | ${errored} err${c.reset}`
  );
  if (failures.length) {
    console.log(`${c.red}Failures:${c.reset}`);
    for (const f of failures.slice(0, 8)) {
      console.log(`  ${f.id} [${f.group}]: ${f.reasons[0] ?? "fail"}`);
    }
    if (failures.length > 8) console.log(`  ... +${failures.length - 8} more`);
  }
  if (fixes.length) console.log(`${c.cyan}Auto-fix notes: ${fixes.join("; ")}${c.reset}`);

  state.iterations.push({ iteration, passPct, avgCeo, judgeOk });
  state.totalScenarios += results.length;
  state.uniqueIds = new Set([...(state.uniqueIds ?? []), ...results.map((r) => r.id)]);

  const lastTwo = state.iterations.slice(-2);
  const happy =
    lastTwo.length === 2 &&
    lastTwo.every((x) => x.passPct >= cfg.targetPass && x.avgCeo >= cfg.targetCeo && x.judgeOk);

  return { report, happy, passPct, avgCeo };
}

async function main() {
  const cfg = parseArgs();
  const deadline = Date.now() + cfg.durationMin * 60_000;

  console.log(`\n${c.bold}${c.cyan}Kira Agent Loop${c.reset}`);
  console.log(`${c.dim}Duration: ${cfg.durationMin}min | Batch: ${cfg.batchSize} personas + ${cfg.edgeSize} random edge`);
  console.log(`Targets: ${cfg.targetPass}% pass, CEO ≥${cfg.targetCeo}/10 | API: ${API_URL}${c.reset}\n`);

  await assertDevServerAvailable();

  const allPersonas = flattenPersonas();
  console.log(`${c.dim}Pool: ${allPersonas.length} personas + ${FIXED_EDGE.length} fixed edge cases${c.reset}`);

  const state = { iterations: [], totalScenarios: 0, uniqueIds: new Set() };
  let iteration = 0;
  let exitReason = "duration";

  while (Date.now() < deadline) {
    iteration++;
    const { happy, passPct, avgCeo } = await runIteration(cfg, iteration, allPersonas, state);

    if (happy) {
      exitReason = "targets_met";
      console.log(`\n${c.green}${c.bold}✓ Two consecutive rounds met targets — stopping early.${c.reset}`);
      break;
    }

    const remaining = Math.round((deadline - Date.now()) / 60_000);
    console.log(`${c.dim}Remaining ~${remaining}min | Unique scenarios seen: ${state.uniqueIds.size}${c.reset}`);

    if (Date.now() >= deadline) break;
    await sleep(2000);
  }

  const summary = {
    finishedAt: new Date().toISOString(),
    exitReason,
    config: cfg,
    iterations: state.iterations.length,
    totalScenariosRun: state.totalScenarios,
    uniqueScenarioIds: state.uniqueIds.size,
    lastIteration: state.iterations[state.iterations.length - 1] ?? null,
    history: state.iterations,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`\n${c.bold}${"─".repeat(60)}${c.reset}`);
  console.log(`${c.bold}Agent loop complete${c.reset} (${exitReason})`);
  console.log(`Iterations: ${state.iterations.length} | Scenarios run: ${state.totalScenarios} | Unique IDs: ${state.uniqueIds.size}`);
  console.log(`Results: ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
