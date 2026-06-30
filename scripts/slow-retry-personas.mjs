#!/usr/bin/env node
/**
 * Slow persona retry — one request every N ms to avoid Groq rate limits.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevServerAvailable } from "./test-runner.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const delayMs = Number(process.argv[2] ?? "4000");
  const inPath = process.argv[3] ?? join(ROOT, "test-results", "ceo-500", "results.json");
  const outPath = process.argv[4] ?? join(ROOT, "test-results", "ceo-500", "slow-retry-r3.json");

  await assertDevServerAvailable();
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const rows = JSON.parse(await readFile(inPath, "utf8"));
  const ids = rows.filter((r) => r.isError).map((r) => r.id);
  if (!ids.length) {
    console.log("No errored personas to retry.");
    return;
  }
  console.log(`Slow retry ${ids.length} personas (${delayMs}ms spacing)…\n`);

  const patched = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`  [${i + 1}/${ids.length}] ${id}… `);
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          join(__dirname, "test-personas.mjs"),
          "--id",
          id,
          "--concurrency",
          "1",
          "--out",
          join(ROOT, "test-results", "ceo-500", `_one-${id}.json`),
        ],
        { cwd: ROOT, env: process.env, timeout: 120_000 }
      );
      const one = JSON.parse(
        await readFile(join(ROOT, "test-results", "ceo-500", `_one-${id}.json`), "utf8")
      );
      const row = one[0];
      patched.push(row);
      console.log(row.isError ? "ERR" : row.passed ? "PASS" : "FAIL");
    } catch (e) {
      console.log("FAIL", e.message?.slice(0, 60));
      patched.push({ id, isError: true, passed: false, reasons: [String(e.message)] });
    }
    if (i < ids.length - 1) await sleep(delayMs);
  }

  await writeFile(outPath, `${JSON.stringify(patched, null, 2)}\n`);
  const ok = patched.filter((r) => !r.isError && r.passed).length;
  console.log(`\nDone: ${ok}/${patched.length} clean passes → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
