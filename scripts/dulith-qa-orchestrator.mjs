#!/usr/bin/env node
/**
 * dulith-qa-orchestrator.mjs — Master loop: approve all plans → run all domain edge suites.
 *
 * Usage:
 *   npx next dev --port 3107
 *   export KIRA_API_URL=http://localhost:3107/api/chat
 *   node scripts/dulith-qa-orchestrator.mjs --smoke
 *   node scripts/dulith-qa-orchestrator.mjs --full --target 90
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertDevServerAvailable, API_URL } from "./test-runner.mjs";
import { DOMAINS } from "./dulith-domains.mjs";
import { reviewDomainPlan, APPROVAL_THRESHOLD } from "./dulith-plan-review.mjs";
import { blockForPersonaId } from "./lib/language-mode.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "test-results", "dulith-qa");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f, d) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : d;
  };
  return {
    smoke: args.includes("--smoke"),
    full: args.includes("--full"),
    target: Number(get("--target", "90")),
    domain: get("--domain", null),
    lang: get("--lang", null),
    skipPlans: args.includes("--skip-plans"),
    delayMs: Number(get("--delay", "2200")),
  };
}

function summarizeRows(rows, target) {
  const total = rows.length;
  const passed = rows.filter((r) => r.passed ?? r.evaluation?.passed).length;
  const errored = rows.filter((r) => r.isError ?? r.evaluation?.isError).length;
  const ceoRows = rows.filter((r) => r.ceoLens ?? r.evaluation?.ceoLens);
  const ceoPass = ceoRows.filter((r) => (r.ceoLens ?? r.evaluation?.ceoLens).pass).length;
  const personaPct = total ? Math.round((passed / total) * 100) : 0;
  const ceoPct = ceoRows.length ? Math.round((ceoPass / ceoRows.length) * 100) : 0;
  return {
    total,
    passed,
    errored,
    personaPct,
    ceoPct,
    allPass: personaPct >= target && ceoPct >= target,
  };
}

async function runGenerator(script) {
  await execFileAsync(process.execPath, [join(__dirname, script)], { cwd: ROOT });
}

async function loadGroupIds(group) {
  const mod = await import(`./test-personas.mjs?t=${Date.now()}`);
  const list = mod.GROUPS[group.toUpperCase()] ?? mod.GROUPS[group];
  if (!list) throw new Error(`Unknown group ${group}`);
  return list.map((p) => p.id);
}

async function runPersonaBatch(group, ids) {
  const outPath = join(OUT_DIR, `${group}-${ids[0]}-${ids[ids.length - 1]}.json`);
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(__dirname, "test-personas.mjs"),
        "--group",
        group.toLowerCase(),
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
        reject(new Error(`batch exit ${code ?? "?"} — no results`));
      }
    });
  });
}

async function runDomain(domain, cfg) {
  console.log(`\n========== ${domain.title} (Group ${domain.group}) ==========\n`);
  if (cfg.lang) console.log(`Language block: ${cfg.lang}\n`);
  await runGenerator(domain.generator);
  let allIds = await loadGroupIds(domain.group);
  if (cfg.lang) {
    allIds = allIds.filter((id) => blockForPersonaId(id) === cfg.lang);
  }
  let ids;
  if (cfg.full) {
    ids = allIds;
  } else if (domain.smokePerBlock && !cfg.lang) {
    const modes = ["en", "si", "ta", "singlish", "tanglish"];
    ids = modes.flatMap((mode) =>
      allIds.filter((id) => blockForPersonaId(id) === mode).slice(0, domain.smokePerBlock)
    );
  } else {
    ids = allIds.slice(0, domain.smokePerBlock ?? domain.smoke);
  }

  const rows = [];
  const chunk = 20;
  for (let i = 0; i < ids.length; i += chunk) {
    const batch = ids.slice(i, i + chunk);
    console.log(`\n--- ${domain.group} batch ${batch[0]}..${batch[batch.length - 1]} ---\n`);
    rows.push(...(await runPersonaBatch(domain.group, batch)));
    if (i + chunk < ids.length) await new Promise((r) => setTimeout(r, cfg.delayMs));
  }

  const summary = summarizeRows(rows, cfg.target);
  return { domain: domain.id, group: domain.group, ran: ids.length, summary, failures: rows.filter((r) => !(r.passed ?? r.evaluation?.passed)).slice(0, 15) };
}

async function main() {
  const cfg = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  if (!cfg.skipPlans) {
    console.log("\n=== Phase 1: Dulith plan approval ===\n");
    for (const domain of DOMAINS) {
      if (cfg.domain && domain.id !== cfg.domain) continue;
      const review = await reviewDomainPlan(domain);
      console.log(`${domain.id}: ${review.excitement}/10 — ${review.approved ? "APPROVED" : "NEEDS REVISION"}`);
      if (!review.approved) {
        console.error(`Plan ${domain.plan} scored below ${APPROVAL_THRESHOLD}/10`);
        process.exit(1);
      }
    }
    console.log("\nAll plans approved.\n");
  }

  await assertDevServerAvailable();

  console.log("=== Phase 2: Edge suite execution ===\n");
  const domains = cfg.domain ? DOMAINS.filter((d) => d.id === cfg.domain) : DOMAINS;
  const results = [];

  for (const domain of domains) {
    results.push(await runDomain(domain, cfg));
  }

  const aggregate = {
    domains: results.length,
    personaPct: Math.round(results.reduce((s, r) => s + r.summary.personaPct, 0) / results.length),
    ceoPct: Math.round(results.reduce((s, r) => s + r.summary.ceoPct, 0) / results.length),
    allPass: results.every((r) => r.summary.allPass),
  };

  const outPath = join(OUT_DIR, "summary.json");
  await writeFile(outPath, JSON.stringify({ cfg, aggregate, results }, null, 2));

  console.log("\n=== Dulith QA Program Summary ===");
  for (const r of results) {
    console.log(
      `${r.domain} (Group ${r.group}): ${r.summary.passed}/${r.summary.total} (${r.summary.personaPct}%) CEO ${r.summary.ceoPct}%`
    );
  }
  console.log(`\nAggregate: persona ${aggregate.personaPct}% | CEO ${aggregate.ceoPct}%`);
  console.log(`Written → ${outPath}\n`);

  if (!aggregate.allPass) {
    console.log("One or more domains below target — triage failures and loop fixes.");
    process.exit(1);
  }
  console.log("All domains passed Dulith QA gates.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
