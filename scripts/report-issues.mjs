import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { formatCheck } from "./evaluate.mjs";
import { TESTS } from "./test-suite.mjs";

const execFileAsync = promisify(execFile);
const REPO = "Cookie-Cat21/Kira";
const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, "results.json");
const LABELS = {
  bug: "d73a4a",
  language: "5319e7",
  feature: "0e8a16",
  "needs-human-review": "fbca04",
};

const payload = JSON.parse(await readFile(RESULTS_PATH, "utf8"));
const testsById = new Map(TESTS.map((test) => [test.id, test]));
const failures = payload.results.filter((result) => !result.passed);

await ensureLabels();

const created = [];
const skipped = [];

for (const result of failures) {
  const test = testsById.get(result.id);
  const title = `[Test #${result.id}] ${result.name} — FAILED`;
  const existing = await findIssueByTitle(title, result.id);

  if (existing) {
    result.issueUrl = existing.url;
    skipped.push(existing.url);
    console.log(`Skipped existing issue: ${title}`);
    continue;
  }

  const labels = `bug,${result.group}`;
  const body = buildIssueBody(test, result);
  const { stdout } = await gh([
    "issue",
    "create",
    "--repo",
    REPO,
    "--title",
    title,
    "--label",
    labels,
    "--body",
    body,
  ]);
  const url = stdout.trim();
  result.issueUrl = url;
  created.push(url);
  console.log(`Created issue: ${url}`);
}

await writeFile(RESULTS_PATH, `${JSON.stringify(payload, null, 2)}\n`);

console.log("");
console.log(`Issues created: ${created.length}`);
for (const url of created) console.log(`- ${url}`);
if (skipped.length > 0) console.log(`Existing issues skipped: ${skipped.length}`);

async function ensureLabels() {
  const { stdout } = await gh([
    "label",
    "list",
    "--repo",
    REPO,
    "--json",
    "name",
    "--limit",
    "200",
  ]);
  const existing = new Set(JSON.parse(stdout).map((label) => label.name));

  for (const [name, color] of Object.entries(LABELS)) {
    if (existing.has(name)) continue;
    await gh(["label", "create", name, "--repo", REPO, "--color", color], {
      ignoreAlreadyExists: true,
    });
    console.log(`Created label: ${name}`);
  }
}

async function findIssueByTitle(title, id) {
  const { stdout } = await gh([
    "issue",
    "list",
    "--repo",
    REPO,
    "--state",
    "all",
    "--search",
    `Test #${id}`,
    "--json",
    "title,url",
    "--limit",
    "100",
  ]);
  const matches = JSON.parse(stdout);
  return matches.find((issue) => issue.title === title) ?? null;
}

function buildIssueBody(test, result) {
  const requestJson = JSON.stringify(test.request, null, 2);
  const expected = test.checks.map((check) => `- ${formatCheck(check)}`).join("\n");
  const failed = result.failedChecks
    .map((check) => `- ${check.check}: ${check.reason}`)
    .join("\n");

  return `## Test Failure: ${result.name}

**Test ID:** #${result.id}  
**Group:** ${result.group} / ${result.subgroup}  
**Notes:** ${test.notes || "None"}

## Input Sent
\`\`\`json
${requestJson}
\`\`\`

## Expected
${expected}

## Actual
**Response text:**
> ${blockquote(result.responseText || "(empty)")}

**SSE events received:** ${result.eventsReceived.join(", ") || "(none)"}

## Failed Checks
${failed || "- Unknown failure"}

## Auto-fixable
${test.autoFixable ? "yes" : "no"}
`;
}

function blockquote(text) {
  return String(text).replace(/\r?\n/g, "\n> ").slice(0, 8_000);
}

async function gh(args, options = {}) {
  try {
    return await execFileAsync("gh", args, { maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    const stderr = String(err.stderr ?? "");
    if (options.ignoreAlreadyExists && /already exists/i.test(stderr)) {
      return { stdout: "", stderr };
    }
    throw err;
  }
}
