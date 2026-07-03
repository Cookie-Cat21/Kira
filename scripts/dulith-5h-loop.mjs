#!/usr/bin/env node
/**
 * dulith-5h-loop.mjs — Autonomous 5-hour improvement cycle.
 * Runs comprehensive production QA, logs failures, exits non-zero if any gate fails.
 *
 * Usage:
 *   KIRA_API_URL=https://kira-peach.vercel.app/api/chat node scripts/dulith-5h-loop.mjs
 *   node scripts/dulith-5h-loop.mjs --duration 300   # minutes (default 300 = 5h budget marker)
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "test-results", "dulith-5h");

const PROD = process.env.KIRA_API_URL ?? "https://kira-peach.vercel.app/api/chat";
const durationMin = Number(process.argv.find((a, i) => process.argv[i - 1] === "--duration") ?? 300);
const deadline = Date.now() + durationMin * 60_000;

function timeLeft() {
  const ms = deadline - Date.now();
  return ms > 0 ? `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s` : "0m";
}

async function runPhase(label, script, args = []) {
  console.log(`\n${"=".repeat(60)}\n[${new Date().toISOString()}] ${label} (${timeLeft()} left)\n`);
  const logPath = join(OUT, `${label.replace(/\W+/g, "-").toLowerCase()}.log.json`);
  const started = Date.now();
  try {
    await execFileAsync(process.execPath, [join(__dirname, script), ...args], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, KIRA_API_URL: PROD },
    });
    await writeFile(logPath, JSON.stringify({ label, pass: true, ms: Date.now() - started }, null, 2));
    return { label, pass: true };
  } catch (e) {
    await writeFile(logPath, JSON.stringify({ label, pass: false, ms: Date.now() - started, error: String(e) }, null, 2));
    return { label, pass: false };
  }
}

async function runPersonaGroup(group) {
  const outPath = join(OUT, `group-${group.toLowerCase()}.json`);
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        join(__dirname, "test-personas.mjs"),
        "--group",
        group.toLowerCase(),
        "--concurrency",
        "1",
        "--out",
        outPath,
      ],
      { cwd: ROOT, env: { ...process.env, KIRA_API_URL: PROD }, stdio: "inherit" }
    );
    child.on("close", async (code) => {
      let summary = { group, pass: code === 0 };
      try {
        const rows = JSON.parse(await readFile(outPath, "utf8"));
        const total = rows.length;
        const passed = rows.filter((r) => r.passed && !r.isError).length;
        const errored = rows.filter((r) => r.isError).length;
        const ceoRows = rows.filter((r) => r.ceoLens);
        const ceoPass = ceoRows.filter((r) => r.ceoLens?.pass).length;
        summary = {
          group,
          pass: code === 0,
          total,
          passed,
          errored,
          personaPct: total ? Math.round((passed / total) * 100) : 0,
          ceoPct: ceoRows.length ? Math.round((ceoPass / ceoRows.length) * 100) : 0,
          failures: rows.filter((r) => !r.passed && !r.isError).slice(0, 20),
        };
      } catch {
        /* no results file */
      }
      resolve(summary);
    });
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const cycleReport = { started: new Date().toISOString(), apiUrl: PROD, phases: [] };

  console.log(`\n=== Dulith 5-Hour Improvement Loop ===`);
  console.log(`Target: ${PROD}`);
  console.log(`Duration budget: ${durationMin} minutes\n`);

  // Phase 1: Live traps (fast sanity)
  cycleReport.phases.push(await runPhase("live-regression", "live-regression.mjs"));

  // Phase 2: Core curated groups A–G (founder-critical)
  for (const g of ["A", "B", "C", "D", "E", "F", "G"]) {
    if (Date.now() > deadline) break;
    const r = await runPersonaGroup(g);
    cycleReport.phases.push(r);
    console.log(`Group ${g}: ${r.personaPct ?? "?"}% persona, CEO ${r.ceoPct ?? "?"}%`);
  }

  // Phase 3: Full Dulith domains S–X
  if (Date.now() < deadline) {
    cycleReport.phases.push(
      await runPhase("dulith-qa-full", "dulith-qa-orchestrator.mjs", ["--full", "--skip-plans"])
    );
  }

  // Phase 4: Generated groups H–M (breadth)
  for (const g of ["H", "I", "J", "K", "L", "M"]) {
    if (Date.now() > deadline) break;
    const r = await runPersonaGroup(g);
    cycleReport.phases.push(r);
    console.log(`Group ${g}: ${r.personaPct ?? "?"}% persona, CEO ${r.ceoPct ?? "?"}%`);
  }

  // Phase 5: Final gate
  if (Date.now() < deadline) {
    cycleReport.phases.push(await runPhase("dulith-final-gate", "dulith-final-gate.mjs"));
  }

  cycleReport.finished = new Date().toISOString();
  cycleReport.allPass = cycleReport.phases.every((p) => p.pass !== false);
  await writeFile(join(OUT, "cycle-summary.json"), JSON.stringify(cycleReport, null, 2));

  console.log(`\n=== Cycle complete ===`);
  console.log(`Report → ${join(OUT, "cycle-summary.json")}`);
  if (!cycleReport.allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
