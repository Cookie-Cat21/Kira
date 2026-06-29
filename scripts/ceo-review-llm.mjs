#!/usr/bin/env node
/**
 * ceo-review-llm.mjs — Full Dulith-inspired LLM review for flagged persona responses.
 *
 * Usage:
 *   node scripts/ceo-review-llm.mjs
 *   node scripts/ceo-review-llm.mjs --ids F07,C20,C25
 *   node scripts/ceo-review-llm.mjs --from test-results/persona-batch-summary.json
 *
 * Reads GROQ_API_KEY from .env.local (never logs keys). Rotates _2/_3 on 429.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const DEFAULT_RESULTS = join(ROOT, "test-results", "persona-results-ABF.json");
const DEFAULT_SUMMARY = join(ROOT, "test-results", "persona-batch-summary.json");
const OUT_PATH = join(ROOT, "test-results", "ceo-llm-reviews.json");

const MODELS = ["llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.1-8b-instant"];
const DELAY_MS = 2_500;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const DULITH_SYSTEM = `You are a Dulith Herath-inspired Sri Lankan e-commerce founder evaluator (NOT Dulith himself).

You review ONE Kira chat turn from the Kapruka AI shopping agent challenge. Be sharp, practical, founder-like — not a generic teacher.

Evaluate the assistant reply for:
- Customer usefulness in Sri Lanka (gifts, delivery, logistics, trust)
- Warm friend tone vs corporate robot
- Correct flow (ask when vague, search when clear, checkout field collection, tracking)
- Real Kapruka catalog behavior (products SSE vs invented listings)
- Would a Kapruka-style founder remember this after 50 demos?

Respond in this exact markdown structure:

## My honest first reaction
(one paragraph)

## Excitement score
X/10

## Why this could impress a Kapruka-style founder
(bullets)

## What feels weak or average
(bullets)

## 3 upgrades that would increase excitement most
1. ...
2. ...
3. ...

## Final verdict
Would I remember this after 50 submissions? Yes/No — one sentence why.

## Revised excitement score after scrutiny
X/10`;

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let raw = trimmed.slice(eq + 1).trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    vars[key] = raw;
  }
  return vars;
}

function collectKeys(vars) {
  return [vars.GROQ_API_KEY, vars.GROQ_API_KEY_2, vars.GROQ_API_KEY_3].filter(
    (k) => typeof k === "string" && k.length > 10
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function groqReview(apiKey, model, userPrompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: DULITH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 900,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body.choices?.[0]?.message?.content?.trim() ?? "";
}

function buildCasePrompt(row) {
  return `## Test case ${row.id} (Group ${row.group})
**Scenario:** ${row.note}
**User message:** ${row.msg}
**Automated persona pass:** ${row.passed ? "PASS" : "FAIL"}
**Failure reasons:** ${row.reasons?.length ? row.reasons.join("; ") : "none"}
**Tool calls (MCP steps):** ${row.toolCalls ?? "unknown"}
**Heuristic CEO lens:** ${row.ceoLens ? `${row.ceoLens.score}/10 — ${row.ceoLens.verdict}` : "n/a"}

**Kira's actual reply:**
${row.response || "(empty)"}

Review this single turn. If the user message implies checkout/tracking/search, judge whether Kira did the commercially right thing for Kapruka.`;
}

function extractScores(review) {
  const exc = review.match(/## Excitement score\s*\n\s*(\d+)\s*\/\s*10/i);
  const revised = review.match(/## Revised excitement score after scrutiny\s*\n\s*(\d+)\s*\/\s*10/i);
  const remember = review.match(/Would I remember this after 50 submissions\?\s*(Yes|No)/i);
  return {
    excitement: exc ? Number(exc[1]) : null,
    revised: revised ? Number(revised[1]) : null,
    memorable: remember ? remember[1].toLowerCase() === "yes" : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const resultsPath = args.includes("--results")
    ? args[args.indexOf("--results") + 1]
    : DEFAULT_RESULTS;
  let ids = args.includes("--ids")
    ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim().toUpperCase())
    : null;

  if (!ids) {
    const summaryPath = args.includes("--from")
      ? args[args.indexOf("--from") + 1]
      : DEFAULT_SUMMARY;
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    ids = (summary.lowCeo ?? []).map((x) => x.id);
  }

  const allRows = JSON.parse(await readFile(resultsPath, "utf8"));
  const rows = ids.map((id) => allRows.find((r) => r.id === id)).filter(Boolean);
  if (rows.length === 0) {
    console.error(`${c.red}No matching persona rows for IDs: ${ids.join(", ")}${c.reset}`);
    process.exit(1);
  }

  const env = parseEnvFile(await readFile(ENV_PATH, "utf8"));
  const keys = collectKeys(env);
  if (keys.length === 0) {
    console.error(`${c.red}No GROQ_API_KEY in .env.local${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}${c.cyan}Dulith LLM review — ${rows.length} flagged persona(s)${c.reset}`);
  console.log(`${c.dim}Models: ${MODELS.join(" → ")} | keys: ${keys.length}${c.reset}\n`);

  const reviews = [];
  let keyIdx = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prompt = buildCasePrompt(row);
    let review = null;
    let modelUsed = null;
    let lastErr = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const apiKey = keys[(keyIdx + attempt) % keys.length];
        try {
          process.stdout.write(`${c.dim}[${i + 1}/${rows.length}] ${row.id} via ${model}...${c.reset} `);
          review = await groqReview(apiKey, model, prompt);
          modelUsed = model;
          keyIdx = (keyIdx + attempt + 1) % keys.length;
          console.log(`${c.green}ok${c.reset}`);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (err.status === 429) {
            console.log(`${c.yellow}429, rotate key${c.reset}`);
            await sleep(3_000);
            continue;
          }
          console.log(`${c.red}${err.message}${c.reset}`);
          break;
        }
      }
      if (review) break;
    }

    if (!review) {
      reviews.push({
        id: row.id,
        group: row.group,
        error: lastErr?.message ?? "All models failed",
      });
    } else {
      const scores = extractScores(review);
      reviews.push({
        id: row.id,
        group: row.group,
        note: row.note,
        personaPassed: row.passed,
        heuristicCeoScore: row.ceoLens?.score,
        model: modelUsed,
        ...scores,
        review,
      });
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify({ reviewedAt: new Date().toISOString(), reviews }, null, 2)}\n`);

  console.log(`\n${c.bold}Summary${c.reset}`);
  for (const r of reviews) {
    if (r.error) {
      console.log(`  ${c.red}${r.id}${c.reset} ERR — ${r.error}`);
      continue;
    }
    const score = r.revised ?? r.excitement ?? "?";
    const mem = r.memorable === true ? "memorable" : r.memorable === false ? "forgettable" : "";
    console.log(
      `  ${r.id} — ${c.bold}${score}/10${c.reset} revised (${r.model?.split("/").pop()}) ${mem} | persona ${r.personaPassed ? "PASS" : "FAIL"}`
    );
  }
  console.log(`\n${c.dim}Full reviews: ${OUT_PATH}${c.reset}\n`);
}

main().catch((err) => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
