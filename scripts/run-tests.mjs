import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateTest } from "./evaluate.mjs";
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";
import { TESTS } from "./test-suite.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, "..", "test-results", "results.json");

try {
  await assertDevServerAvailable();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const results = [];
const selectedIds = parseListArg("--id");
const selectedTests =
  selectedIds.length > 0
    ? TESTS.filter((test) => selectedIds.includes(String(test.id)))
    : TESTS;

if (selectedIds.length > 0 && selectedTests.length === 0) {
  console.error(`No tests matched --id ${selectedIds.join(",")}`);
  process.exit(1);
}

for (let i = 0; i < selectedTests.length; i++) {
  const test = selectedTests[i];
  const runResult = await sendTestCase(test);
  const evaluation = evaluateTest(test, runResult);
  const result = toResult(test, runResult, evaluation);
  results.push(result);

  const icon = result.passed ? "✓" : result.isErr ? "~" : "✗";
  console.log(
    `${icon} [${i + 1}/${selectedTests.length}] ${test.name} (${result.durationMs}ms)`
  );

  for (const failedCheck of result.failedChecks) {
    console.log(`  - ${failedCheck.check}: ${failedCheck.reason}`);
  }

  if (i < selectedTests.length - 1 && test.subgroup !== "deterministic") {
    await delay(2_000);
  }
}

const passed = results.filter((r) => r.passed).length;
const errs   = results.filter((r) => r.isErr).length;
const failed = results.length - passed - errs;
const payload = {
  runAt: new Date().toISOString(),
  passed,
  failed,
  errs,
  results,
};

await mkdir(dirname(RESULTS_PATH), { recursive: true });
await writeFile(RESULTS_PATH, `${JSON.stringify(payload, null, 2)}\n`);

console.log("");
console.log("Summary");
console.log("-------");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Errors: ${errs}  (rate-limit/fallback — re-run individually)`);
console.log(`Total:  ${results.length}`);
console.log(`Wrote:  ${RESULTS_PATH}`);

function toResult(test, runResult, evaluation) {
  return {
    id: test.id,
    name: test.name,
    group: test.group,
    subgroup: test.subgroup,
    passed: evaluation.passed,
    ...(evaluation.isErr ? { isErr: true } : {}),
    durationMs: runResult.durationMs,
    failedChecks: evaluation.failedChecks,
    responseText: runResult.responseText,
    eventsReceived: runResult.events.map((event) => event.t),
    ...(runResult.status ? { status: runResult.status } : {}),
    ...(runResult.error ? { error: runResult.error } : {}),
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseListArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return [];
  const raw = process.argv[index + 1] ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
