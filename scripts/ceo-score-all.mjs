#!/usr/bin/env node
/**
 * ceo-score-all.mjs — Score every persona result with CEO lens (0–100) + optional LLM review.
 *
 * Usage:
 *   node scripts/ceo-score-all.mjs --from test-results/persona-results.json
 *   node scripts/ceo-score-all.mjs --from test-results/persona-results.json --llm --below 90
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ceoPassAt90, ceoScorePercent } from "./ceo-lens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const DEFAULT_IN = join(ROOT, "test-results", "persona-results.json");
const OUT_PATH = join(ROOT, "test-results", "ceo-scored-results.json");

const MODELS = ["llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct"];
const DELAY_MS = 2200;

const DULITH_JSON_SYSTEM = `You are a Dulith Herath-inspired Sri Lankan e-commerce founder evaluator (NOT Dulith himself).
Return ONLY valid JSON:
{"excitement":0-100,"pass":boolean,"flags":["..."],"fixHint":"one sentence","memorable":boolean}`;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f, d) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : d;
  };
  return {
    from: get("--from", DEFAULT_IN),
    llm: args.includes("--llm"),
    below: Number(get("--below", "90")),
    limit: Number(get("--limit", "0")),
  };
}

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

function collectKeys(vars) {
  return [vars.GROQ_API_KEY, vars.GROQ_API_KEY_2, vars.GROQ_API_KEY_3].filter(
    (k) => typeof k === "string" && k.length > 10
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function llmScore(apiKey, row) {
  const user = `Scenario: ${row.note}
User: ${row.msg}
Persona pass: ${row.passed}
Reply: ${row.response}
CEO heuristic: ${row.ceoScore}/100 flags=${(row.ceoFlags ?? []).join(",")}`;
  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: DULITH_JSON_SYSTEM },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      const raw = body.choices?.[0]?.message?.content ?? "{}";
      const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      return json;
    } catch {
      await sleep(1500);
    }
  }
  return null;
}

async function main() {
  const cfg = parseArgs();
  const rows = JSON.parse(await readFile(cfg.from, "utf8"));
  let keyIdx = 0;
  let keys = [];
  if (cfg.llm) {
    const env = parseEnvFile(await readFile(ENV_PATH, "utf8"));
    keys = collectKeys(env);
    if (!keys.length) {
      console.error("No GROQ_API_KEY for --llm");
      process.exit(1);
    }
  }

  const scored = [];
  for (const row of rows) {
    const heuristicPct = ceoScorePercent(row.ceoLens);
    const heuristicPass = ceoPassAt90(row.ceoLens) && row.passed;
    let entry = {
      id: row.id,
      group: row.group,
      note: row.note,
      msg: row.msg,
      passed: row.passed,
      isError: row.isError,
      ceoScore: heuristicPct,
      ceoPass: heuristicPass,
      ceoFlags: row.ceoLens?.flags ?? [],
      ceoVerdict: row.ceoLens?.verdict ?? "",
      response: row.response,
    };

    const needsLlm =
      cfg.llm && (!heuristicPass || heuristicPct < cfg.below) && !row.isError;
    if (needsLlm) {
      const llm = await llmScore(keys[keyIdx % keys.length], entry);
      keyIdx++;
      if (llm) {
        entry.llmExcitement = llm.excitement;
        entry.llmPass = llm.pass && llm.excitement >= cfg.below;
        entry.llmFixHint = llm.fixHint;
        entry.ceoScore = Math.max(heuristicPct, llm.excitement ?? 0);
        entry.ceoPass = entry.ceoScore >= cfg.below && row.passed && llm.pass !== false;
      }
      await sleep(DELAY_MS);
    }
    scored.push(entry);
    if (cfg.limit > 0 && scored.length >= cfg.limit) break;
  }

  const genuine = scored.filter((r) => !r.isError);
  const summary = {
    at: new Date().toISOString(),
    source: cfg.from,
    total: scored.length,
    personaPassPct: genuine.length
      ? Math.round((genuine.filter((r) => r.passed).length / genuine.length) * 100)
      : 0,
    ceoPassPct: genuine.length
      ? Math.round((genuine.filter((r) => r.ceoPass).length / genuine.length) * 100)
      : 0,
    avgCeoScore: genuine.length
      ? Math.round(genuine.reduce((a, r) => a + r.ceoScore, 0) / genuine.length)
      : 0,
    belowThreshold: scored.filter((r) => !r.ceoPass && !r.isError),
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify({ summary, results: scored }, null, 2)}\n`);

  console.log(`CEO scored ${scored.length} rows → ${OUT_PATH}`);
  console.log(`  Persona pass: ${summary.personaPassPct}%`);
  console.log(`  CEO pass (≥${cfg.below}): ${summary.ceoPassPct}%`);
  console.log(`  Avg CEO score: ${summary.avgCeoScore}/100`);
  if (summary.belowThreshold.length) {
    console.log(`  Below threshold: ${summary.belowThreshold.slice(0, 15).map((r) => r.id).join(", ")}${summary.belowThreshold.length > 15 ? "…" : ""}`);
  }
  process.exit(summary.ceoPassPct >= cfg.below && summary.personaPassPct >= cfg.below ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
