#!/usr/bin/env node
/**
 * dulith-plan-review.mjs — Founder-style plan approval (≥9/10 auto-approves).
 *
 * Usage:
 *   node scripts/dulith-plan-review.mjs                    # search-routing (legacy default)
 *   node scripts/dulith-plan-review.mjs --all              # every domain in dulith-domains.mjs
 *   node scripts/dulith-plan-review.mjs --domain category-purity
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAINS, criteriaForDomain, getDomain } from "./dulith-domains.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const APPROVAL_THRESHOLD = 9;

export function reviewPlanText(planText, criteria) {
  const results = criteria.map((c) => ({
    ...c,
    pass: c.test(planText),
    earned: c.test(planText) ? c.weight : 0,
  }));
  const maxScore = criteria.reduce((s, c) => s + c.weight, 0);
  const score = results.reduce((s, r) => s + r.earned, 0);
  const excitement = maxScore ? Math.round((score / maxScore) * 10) : 0;
  const failed = results.filter((r) => !r.pass);
  const approved = excitement >= APPROVAL_THRESHOLD;
  const verdict = approved
    ? "APPROVED — plan survives founder scrutiny; proceed to implementation."
    : `NEEDS REVISION — score ${excitement}/10; fix: ${failed.map((f) => f.id).join(", ")}`;

  return { score, maxScore, excitement, results, verdict, approved };
}

export async function reviewDomainPlan(domain) {
  const planPath = join(ROOT, domain.plan);
  const planText = await readFile(planPath, "utf8");
  const review = reviewPlanText(planText, criteriaForDomain(domain));
  return { domain, planPath, ...review };
}

/** @deprecated use reviewDomainPlan */
export async function reviewPlan(planText) {
  const criteria = criteriaForDomain(getDomain("search-routing"));
  return reviewPlanText(planText, criteria);
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const domainIdx = args.indexOf("--domain");
  const domainId =
    domainIdx >= 0 ? args[domainIdx + 1] : all ? null : "search-routing";

  const targets = all ? DOMAINS : [getDomain(domainId)];

  console.log("\n=== Dulith-inspired Plan Review ===\n");
  let anyFailed = false;

  for (const domain of targets) {
    const review = await reviewDomainPlan(domain);
    console.log(`## ${domain.title} (${domain.id})`);
    console.log(`Plan: ${domain.plan}`);
    console.log(
      `My honest first reaction: ${review.approved ? "Solid architecture — ship the edge suite." : "Direction OK but plan doc needs work."}`
    );
    console.log(`Excitement score: ${review.excitement}/10\n`);

    for (const r of review.results) {
      console.log(`  ${r.pass ? "✓" : "✗"} ${r.id}: ${r.note}`);
    }
    console.log(`\nVerdict: ${review.verdict}\n`);
    if (!review.approved) anyFailed = true;
  }

  if (anyFailed) {
    console.error("One or more plans scored below 9/10 — revise docs before running edge suites.");
    process.exit(1);
  }

  console.log("All reviewed plans scored 9+/10 — auto-approved for implementation loops.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
