#!/usr/bin/env node
/**
 * Merge retry batch rows into full CEO-500 results and recompute summary.json.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ceoPassAt90, ceoScorePercent } from "./ceo-lens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "test-results", "ceo-500");

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
  const basePath = process.argv[2] ?? join(OUT, "results.json");
  const patchPath = process.argv[3] ?? join(OUT, "rerun-final-r3.json");
  const target = Number(process.argv[4] ?? "90");

  const base = JSON.parse(await readFile(basePath, "utf8"));
  const patch = JSON.parse(await readFile(patchPath, "utf8"));
  const byId = new Map(base.map((r) => [r.id, r]));
  for (const row of patch) byId.set(row.id, row);

  const results = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
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
    api: base[0]?.api ?? process.env.KIRA_API_URL ?? "",
    count: results.length,
    personaPassPct,
    ceoPassPct,
    avgCeoScore: avgCeo,
    target,
    passGate: personaPassPct >= target && ceoPassPct >= target,
    errors: results.filter((r) => r.isError).length,
    clusters: clusterFailures(results, target),
  };

  await writeFile(join(OUT, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(join(OUT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(OUT, "triage.json"), `${JSON.stringify(summary.clusters, null, 2)}\n`);

  console.log(
    `Merged ${patch.length} patch rows → ${results.length} total | errors ${summary.errors} | persona ${personaPassPct}% | CEO ${ceoPassPct}% | avg ${avgCeo} | passGate ${summary.passGate}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
