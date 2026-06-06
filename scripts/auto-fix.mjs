import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { TESTS } from "./test-suite.mjs";

const execFileAsync = promisify(execFile);
const REPO = "Cookie-Cat21/Kira";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RESULTS_PATH = join(__dirname, "results.json");
const CHAT_ROUTE_PATH = join(ROOT, "app", "api", "chat", "route.ts");

const payload = JSON.parse(await readFile(RESULTS_PATH, "utf8"));
const testsById = new Map(TESTS.map((test) => [test.id, test]));
const failures = payload.results.filter((result) => !result.passed);

let source = await readFile(CHAT_ROUTE_PATH, "utf8");
let changed = false;
let fixed = 0;

for (const result of failures) {
  const test = testsById.get(result.id);
  if (!test?.autoFixable) {
    await markNeedsHumanReview(result);
    continue;
  }

  const failureChecks = result.failedChecks.map((check) => check.check);
  let handled = false;

  if (
    result.group === "language" &&
    failureChecks.some((check) => check.startsWith("noUnicode"))
  ) {
    const nextSource = tightenEnglishLanguageInstruction(source);
    if (nextSource !== source) {
      source = nextSource;
      changed = true;
      fixed += 1;
      console.log("FIXED: tightened EN language instruction");
    }
    handled = true;
  }

  if (
    result.subgroup === "deterministic" &&
    failureChecks.some((check) => check.startsWith("eventHasProducts"))
  ) {
    const keyword = extractProductKeyword(test);
    const nextSource = addCategoryQuery(source, keyword);
    if (nextSource !== source) {
      source = nextSource;
      changed = true;
      fixed += 1;
      console.log("FIXED: added missing category to CATEGORY_QUERY_MAP");
    }
    handled = true;
  }

  if (failureChecks.some((check) => check.startsWith("noHallucinatedProducts"))) {
    const keyword = extractProductKeyword(test);
    const nextSource = addShoppingInterceptKeyword(source, keyword);
    if (nextSource !== source) {
      source = nextSource;
      changed = true;
      fixed += 1;
      console.log("FIXED: added keyword to hallucination intercept");
    }
    handled = true;
  }

  if (!handled) {
    await markNeedsHumanReview(result);
  }
}

if (changed) {
  await writeFile(CHAT_ROUTE_PATH, source);
}

console.log(`Auto-fix complete: ${fixed} fix attempt(s) applied`);

function tightenEnglishLanguageInstruction(text) {
  const sentence =
    "Under no circumstances write characters in the Unicode ranges U+0D80–U+0DFF (Sinhala) or U+0B80–U+0BFF (Tamil).";

  if (text.includes(sentence)) return text;

  const anchor =
    "Do NOT write any Sinhala Unicode characters";
  const idx = text.indexOf(anchor);
  if (idx === -1) return text;

  const lineStart = text.lastIndexOf('"', idx);
  const lineEnd = text.indexOf('";', idx);
  if (lineStart === -1 || lineEnd === -1) return text;

  return `${text.slice(0, lineEnd)} ${sentence}${text.slice(lineEnd)}`;
}

function addCategoryQuery(text, keyword) {
  if (!keyword) return text;

  const key = keyword.toLowerCase();
  const value = categoryValueFor(key);
  const objectMatch = text.match(
    /const CATEGORY_QUERY_MAP: Record<string, string> = \{[\s\S]*?\n\};/
  );
  if (!objectMatch) return text;

  const objectText = objectMatch[0];
  if (new RegExp(`\\b${escapeRegExp(key)}\\s*:`).test(objectText)) return text;

  const insertion = `  ${JSON.stringify(key)}: ${JSON.stringify(value)},\n`;
  const updatedObject = objectText.replace(/\n\};$/, `\n${insertion}};`);
  return text.replace(objectText, updatedObject);
}

function addShoppingInterceptKeyword(text, keyword) {
  if (!keyword) return text;

  const key = keyword.toLowerCase();
  const regexMatch = text.match(
    /(const SHOPPING_INTENT_RE\s*=\s*\n\s*\/\\b\()([^)]*)(\)\\b\/i;)/
  );
  if (!regexMatch) return text;

  const [, prefix, body, suffix] = regexMatch;
  const parts = body.split("|").map((part) => part.trim());
  if (parts.some((part) => part === key || part === escapeRegexLiteral(key))) {
    return text;
  }

  const updated = `${prefix}${body}|${escapeRegexLiteral(key)}${suffix}`;
  return text.replace(regexMatch[0], updated);
}

function extractProductKeyword(test) {
  const userMessages = test.request.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase());
  const text = userMessages.join(" ");

  const known = [
    ["chocolat", "chocolate"],
    ["flower", "flowers"],
    ["cake", "cakes"],
    ["hamper", "hamper"],
    ["book", "books"],
    ["stationary", "stationary"],
    ["stationery", "stationery"],
    ["basket", "basket"],
    ["gift", "gift"],
    ["toy", "toy"],
    ["fashion", "fashion"],
    ["electronic", "electronics"],
  ];
  const match = known.find(([needle]) => text.includes(needle));
  if (match) return match[1];

  const cleaned = text
    .replace(/\b(show me|show|search|find|on kapruka|more options|under|below|to|for|some|any|please)\b/g, " ")
    .replace(/\b\d[\d,]*\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.split(" ").find((word) => word.length > 2) ?? "";
}

function categoryValueFor(keyword) {
  const values = {
    cakes: "cake",
    cake: "cake",
    flowers: "roses",
    flower: "roses",
    chocolates: "chocolate",
    chocolate: "chocolate",
    books: "books",
    book: "books",
    stationary: "stationery",
    stationery: "stationery",
    basket: "basket",
    hamper: "gift hamper",
  };
  return values[keyword] ?? keyword;
}

async function markNeedsHumanReview(result) {
  const issue = result.issueUrl ?? (await findIssueUrl(result));
  if (!issue) {
    console.log(`SKIPPED: no GitHub issue found for test #${result.id}`);
    return;
  }

  await gh(["issue", "edit", issue, "--add-label", "needs-human-review"]);
  console.log(`LABELLED: ${issue} needs-human-review`);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeRegexLiteral(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
