#!/usr/bin/env node
/**
 * dulith-plan-review.mjs — Founder-style plan approval gate (≥9/10 auto-approves).
 * Reads docs/SEARCH-ROUTING-PLAN.md and scores against Dulith evaluator criteria.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAN_PATH = join(__dirname, "..", "docs", "SEARCH-ROUTING-PLAN.md");
const APPROVAL_THRESHOLD = 9;

const CRITERIA = [
  {
    id: "root_cause",
    weight: 2,
    test: (t) =>
      /whack-a-mole|regex.*per phrasing|multi-category|combo/i.test(t) &&
      /fast-path|before.*LLM|agent loop/i.test(t),
    note: "Names root cause (fast-path vs multi-intent) and rejects regex-only fixes",
  },
  {
    id: "hybrid_routing",
    weight: 2,
    test: (t) => /hybrid|route by intent|bypass|LLM|agent/i.test(t) && /deterministic|fast-path/i.test(t),
    note: "Hybrid routing — keep fast-paths for simple, LLM for complex",
  },
  {
    id: "filter_safety_net",
    weight: 1,
    test: (t) => /safety net|filter|cake exclusion|flower-themed/i.test(t),
    note: "Filters as safety net, not primary strategy",
  },
  {
    id: "automated_qa",
    weight: 2,
    test: (t) => /200|edge|Group S|orchestrator|relevance/i.test(t),
    note: "~200 edge cases + automated relevance QA",
  },
  {
    id: "ceo_gate",
    weight: 1,
    test: (t) => /90%|CEO|Dulith|founder/i.test(t),
    note: "Founder/CEO score gate ≥90%",
  },
  {
    id: "success_metrics",
    weight: 1,
    test: (t) => /success criteria|live repro|chocolates and flowers/i.test(t),
    note: "Concrete success criteria including live repro case",
  },
  {
    id: "sr_lanka_relevance",
    weight: 1,
    test: (t) => /Kapruka|sinhala|Tanglish|Colombo|delivery/i.test(t),
    note: "Sri Lankan / Kapruka context",
  },
  {
    id: "explicit_non_goals",
    weight: 1,
    test: (t) => /do NOT|explicitly do not|not do/i.test(t),
    note: "Clear non-goals (no regex whack-a-mole)",
  },
];

async function reviewPlan(planText) {
  const results = CRITERIA.map((c) => ({
    ...c,
    pass: c.test(planText),
    earned: c.test(planText) ? c.weight : 0,
  }));
  const maxScore = CRITERIA.reduce((s, c) => s + c.weight, 0);
  const score = results.reduce((s, r) => s + r.earned, 0);
  const excitement = Math.round((score / maxScore) * 10);

  const failed = results.filter((r) => !r.pass);
  const verdict =
    excitement >= APPROVAL_THRESHOLD
      ? "APPROVED — plan survives founder scrutiny; proceed to implementation."
      : `NEEDS REVISION — score ${excitement}/10; fix: ${failed.map((f) => f.id).join(", ")}`;

  return { score, maxScore, excitement, results, verdict, approved: excitement >= APPROVAL_THRESHOLD };
}

async function main() {
  const planText = await readFile(PLAN_PATH, "utf8");
  const review = await reviewPlan(planText);

  console.log("\n=== Dulith-inspired Plan Review ===\n");
  console.log(`My honest first reaction: ${review.approved ? "This is the right architecture — stop patching phrases." : "Direction is OK but plan doc is incomplete."}`);
  console.log(`Excitement score: ${review.excitement}/10\n`);

  for (const r of review.results) {
    console.log(`  ${r.pass ? "✓" : "✗"} ${r.id}: ${r.note}`);
  }

  console.log(`\nVerdict: ${review.verdict}\n`);

  if (!review.approved) {
    process.exit(1);
  }

  console.log("Because this scored 9+/10, auto-approving for implementation loop.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export { reviewPlan, APPROVAL_THRESHOLD };
