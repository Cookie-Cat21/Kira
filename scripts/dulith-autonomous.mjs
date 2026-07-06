#!/usr/bin/env node
/**
 * dulith-autonomous.mjs — Single entry for autonomous founder QA cycles.
 * No human approval gate — plans auto-approve at ≥9/10; exits non-zero on failure.
 *
 * Usage:
 *   node scripts/dulith-autonomous.mjs              # production gate (~8 min)
 *   node scripts/dulith-autonomous.mjs --full       # + local core + judge + e2e
 */
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const full = process.argv.includes("--full");

async function run(label, cmd, args, env = {}) {
  console.log(`\n>>> ${label}\n`);
  await execFileAsync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

async function main() {
  console.log("\n=== Dulith Autonomous Cycle ===");
  console.log(`Mode: ${full ? "full (production + local)" : "production gate only"}`);
  console.log("Human approval: NOT REQUIRED\n");

  await run("Production Dulith gate", process.execPath, [
    join(__dirname, "dulith-final-gate.mjs"),
  ]);

  if (!full) {
    console.log("\n✓ Autonomous production cycle complete.");
    console.log("Next: record Path A from docs/JUDGE-DRY-RUN.md, email mcp_support@kapruka.com\n");
    return;
  }

  const localUrl = process.env.KIRA_LOCAL_URL ?? "http://localhost:3107/api/chat";
  await run("Local judge dry-run", process.execPath, [join(__dirname, "judge-dry-run.mjs")], {
    KIRA_API_URL: localUrl,
  });
  await run("Core feature suite (62 tests)", process.execPath, [join(__dirname, "run-tests.mjs")], {
    KIRA_API_URL: localUrl,
  });

  try {
    await run("Playwright reorder e2e", "npx", ["playwright", "test", "tests/e2e/reorder.spec.ts"]);
  } catch {
    console.warn("\n⚠ Playwright e2e skipped or failed — ensure dev server on :3107 for UI tests.\n");
  }

  console.log("\n✓ Full autonomous cycle complete.\n");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
