import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { evaluateTest } from "./evaluate.mjs";
import { assertDevServerAvailable, sendTestCase } from "./test-runner.mjs";
import { TESTS } from "./test-suite.mjs";

const execFileAsync = promisify(execFile);
const REPO = "Cookie-Cat21/Kira";
const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, "..", "test-results", "results.json");

const payload = JSON.parse(await readFile(RESULTS_PATH, "utf8"));
const testsById = new Map(TESTS.map((test) => [test.id, test]));
const failedResults = payload.results.filter((result) => !result.passed);

if (failedResults.length === 0) {
  console.log("No failed tests to re-test");
  process.exit(0);
}

try {
  await assertDevServerAvailable();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let nowPassing = 0;
let stillFailing = 0;
const updatedById = new Map();

for (let i = 0; i < failedResults.length; i++) {
  const oldResult = failedResults[i];
  const test = testsById.get(oldResult.id);
  if (!test) continue;

  const runResult = await sendTestCase(test);
  const evaluation = evaluateTest(test, runResult);
  const nextResult = {
    ...oldResult,
    passed: evaluation.passed,
    durationMs: runResult.durationMs,
    failedChecks: evaluation.failedChecks,
    responseText: runResult.responseText,
    eventsReceived: runResult.events.map((event) => event.t),
    ...(runResult.error ? { error: runResult.error } : { error: undefined }),
  };
  if (!nextResult.error) delete nextResult.error;

  updatedById.set(test.id, nextResult);

  const icon = nextResult.passed ? "✓" : "✗";
  console.log(`${icon} [${i + 1}/${failedResults.length}] ${test.name}`);

  if (nextResult.passed) {
    nowPassing += 1;
    await closeIssue(nextResult);
  } else {
    stillFailing += 1;
    await commentStillFailing(nextResult);
  }

  if (i < failedResults.length - 1 && test.subgroup !== "deterministic") {
    await delay(2_000);
  }
}

payload.results = payload.results.map((result) => updatedById.get(result.id) ?? result);
payload.passed = payload.results.filter((result) => result.passed).length;
payload.failed = payload.results.length - payload.passed;
payload.retestedAt = new Date().toISOString();

await writeFile(RESULTS_PATH, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Re-tested ${failedResults.length} failed tests -> ${nowPassing} now passing, ${stillFailing} still failing`
);

async function closeIssue(result) {
  const issue = result.issueUrl ?? (await findIssueUrl(result));
  if (!issue) return;

  await gh([
    "issue",
    "close",
    issue,
    "--comment",
    "Resolved - test now passing after fix",
  ]);
}

async function commentStillFailing(result) {
  const issue = result.issueUrl ?? (await findIssueUrl(result));
  if (!issue) return;

  await gh([
    "issue",
    "comment",
    issue,
    "--body",
    "Still failing after auto-fix attempt - needs human review",
  ]);
}

async function findIssueUrl(result) {
  const title = `[Test #${result.id}] ${result.name} — FAILED`;
  const { stdout } = await gh([
    "issue",
    "list",
    "--repo",
    REPO,
    "--state",
    "all",
    "--search",
    `Test #${result.id}`,
    "--json",
    "title,url",
    "--limit",
    "100",
  ]);
  const issues = JSON.parse(stdout);
  return issues.find((issue) => issue.title === title)?.url ?? "";
}

async function gh(args) {
  return execFileAsync("gh", args, { maxBuffer: 10 * 1024 * 1024 });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
