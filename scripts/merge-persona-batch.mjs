#!/usr/bin/env node
/**
 * Merge parallel persona batch JSON files into one report.
 * Usage: node scripts/merge-persona-batch.mjs test-results/persona-A.json ...
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "test-results", "persona-results-ABF.json");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/merge-persona-batch.mjs <batch1.json> ...");
  process.exit(1);
}

const merged = [];
for (const f of files) {
  const data = JSON.parse(await readFile(f, "utf8"));
  merged.push(...data);
}
merged.sort((a, b) => a.id.localeCompare(b.id));

const passed = merged.filter((r) => r.passed).length;
const errored = merged.filter((r) => r.isError).length;
const ceoPass = merged.filter((r) => r.ceoLens?.pass).length;
const ceoScored = merged.filter((r) => r.ceoLens).length;

const summary = {
  mergedAt: new Date().toISOString(),
  total: merged.length,
  passed,
  errored,
  failed: merged.length - passed - errored,
  passPct: Math.round((passed / merged.length) * 100),
  ceoLens: { scored: ceoScored, pass: ceoPass, passPct: ceoScored ? Math.round((ceoPass / ceoScored) * 100) : 0 },
  lowCeo: merged
    .filter((r) => r.ceoLens && !r.ceoLens.pass)
    .map((r) => ({ id: r.id, score: r.ceoLens.score, verdict: r.ceoLens.verdict, passed: r.passed })),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(merged, null, 2)}\n`);
await writeFile(
  join(dirname(OUT), "persona-batch-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`
);

console.log(`Merged ${merged.length} personas → ${OUT}`);
console.log(`Persona pass: ${passed}/${merged.length} (${summary.passPct}%)`);
console.log(`CEO lens pass: ${ceoPass}/${ceoScored} (${summary.ceoLens.passPct}%)`);
if (summary.lowCeo.length) {
  console.log(`CEO concerns: ${summary.lowCeo.map((x) => x.id).join(", ")}`);
}
