# Plan 001: Stand up a fast unit-test harness (Vitest) + CI, with coverage of the pure MCP-parsing layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7945c29..HEAD -- package.json lib/mcp-parsing.ts lib/utils.ts`
> The working tree also has *uncommitted* changes (storefront components +
> `app/components/glass/`) that are unrelated to this plan. If `package.json`,
> `lib/mcp-parsing.ts`, or `lib/utils.ts` differ from the "Current state"
> excerpts below, compare before proceeding; on a real mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `7945c29`, 2026-06-11

## Why this matters

This repo has **no fast, deterministic test suite and no CI**. The only
"tests" are `scripts/run-tests.mjs` / `scripts/test-personas.mjs`, which require
a live `GROQ_API_KEY`, hit the rate-limited Groq + Kapruka MCP APIs, and are
non-deterministic — they cannot gate a pull request or protect a refactor. The
codebase has a large body of pure, side-effect-free logic (MCP response
parsing, query parsing, schema coercion) that is trivially unit-testable but
has **zero coverage**. Today nothing but a manual `tsc`/`lint` run catches a
regression. This plan installs Vitest, writes the first real unit tests against
the already-exported pure parsing layer, and adds a GitHub Actions workflow that
runs typecheck + lint + tests on every push. It is the prerequisite for the
larger `app/api/chat/route.ts` split (plan 005), which needs a green test gate
before moving code.

## Current state

- **No test runner**: `package.json` has no `vitest`/`jest` dependency and no
  `test` script that runs unit tests. Current scripts (verified):
  ```json
  // package.json "scripts" (current)
  "lint": "eslint",
  "test:all": "node scripts/run-tests.mjs",      // ← hits live Groq, NOT a unit test
  "test:report": "node scripts/report-issues.mjs"
  ```
- **No `.github/workflows/` directory** — confirmed absent.
- **The unit-test target is `lib/mcp-parsing.ts`** — 8 exported, pure functions
  (no network, no globals), ideal first coverage:
  ```
  lib/mcp-parsing.ts (exports, current):
    readMcpText(content: unknown): string                 // :26
    parseMcpPayload(content: unknown): ParsedMcpPayload    // :44
    formatMcpContentForModel(content: unknown): string     // :68
    extractProductsFromMcp(content: unknown): KiraProduct[]      // :73  (caps at 6)
    extractProductDetailsFromMcp(content: unknown): ...          // :93
    extractDeliveryInfoFromMcp(content: unknown): ...            // :140 (fee/perishable/next-date)
    extractCheckoutInfoFromMcp(content: unknown): ...            // :182
    extractTrackingFromMcp(content: unknown): ...                // :209
  ```
  Read the full file before writing tests — derive expected outputs from the
  actual implementation, not from assumptions about the MCP shape.
- **A second pure module worth a smoke test**: `lib/utils.ts` (the `cn`
  class-merge helper). Read it to confirm its signature before testing.
- **TypeScript is strict** (`tsconfig.json`), path alias `@/*` → repo root.
  Tests must typecheck under the same config.
- **Conventions**: TypeScript throughout, named exports, 2-space indent. Commit
  style is conventional-ish — `git log` shows `feat:`, `fix:`, `chore:`,
  `docs:` prefixes (e.g. `chore: add core test suite, component updates`).

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm install`                 | exit 0              |
| Typecheck | `npx tsc --noEmit`            | exit 0, no errors   |
| Lint      | `npm run lint`                | runs (see note)     |
| Unit test | `npx vitest run`              | all pass            |
| Build     | `npm run build`               | exit 0              |

Note: `npm run lint` currently reports 4 errors (fixed in plan 003) — that is
expected and out of scope here. Do not "fix lint along the way."

## Scope

**In scope** (the only files you should create/modify):
- `package.json` — add `vitest` devDependency + `test` / `test:unit` scripts
- `vitest.config.ts` (create)
- `lib/mcp-parsing.test.ts` (create)
- `lib/utils.test.ts` (create)
- `.github/workflows/ci.yml` (create)
- `package-lock.json` (will change from install — commit it)

**Out of scope** (do NOT touch):
- `app/api/chat/route.ts` and its internal helpers — covered by plan 005;
  exporting/refactoring them here is forbidden (it would collide with 005).
- The existing `scripts/*.mjs` integration suites — leave them as-is; they are
  not unit tests and must not run in CI (they need a live API key).
- Any source file under `app/` — no behavior changes in this plan.

## Git workflow

- Branch: `advisor/001-test-harness-ci`
- Commit per logical unit; conventional style, e.g.
  `chore: add vitest harness + mcp-parsing unit tests` and
  `ci: run typecheck, lint, and unit tests on push`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install Vitest and add scripts

Add Vitest as a dev dependency and wire scripts:
```bash
npm install -D vitest
```
Then add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:unit": "vitest run",
"test:watch": "vitest"
```
Leave the existing `test:all` (integration) script untouched.

**Verify**: `npx vitest --version` prints a version → exit 0.

### Step 2: Add `vitest.config.ts`

Create `vitest.config.ts` at repo root so the `@/*` alias and a node
environment resolve in tests:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
```

**Verify**: `npx vitest run` → exit 0 with "No test files found" (no tests yet).

### Step 3: Write `lib/mcp-parsing.test.ts`

Read `lib/mcp-parsing.ts` in full first. Then write tests covering, per function:
- **Happy path**: a realistic MCP `content` array (the SDK returns
  `[{ type: "text", text: "<json string>" }]`) parsed into the expected shape.
  Derive the exact JSON shape from how each `extract*` function reads it.
- **Empty / malformed input**: `[]`, `undefined`, `[{ type: "text", text: "not json" }]`
  → each function returns its documented empty value (e.g.
  `extractProductsFromMcp` → `[]`, `extractDeliveryInfoFromMcp` → `null`/`undefined`)
  without throwing.
- **The cap behavior**: `extractProductsFromMcp` caps at 6 — feed 10 products,
  assert length ≤ 6.
- **`parseMcpPayload`** ok vs error branches.

Construct inputs from the real code paths — do not invent an MCP shape the code
doesn't read. If a function's expected output is genuinely ambiguous from the
source, write the test to assert "does not throw" + the type shape rather than
guessing a value, and note it in a `// TODO: tighten` comment.

**Verify**: `npx vitest run lib/mcp-parsing.test.ts` → all pass, ≥ 12 tests.

### Step 4: Write `lib/utils.test.ts`

Read `lib/utils.ts`. Write 2–3 tests for `cn` (merges classes, dedupes
conflicting Tailwind classes per its implementation, handles falsy args).

**Verify**: `npx vitest run` → all pass.

### Step 5: Add the CI workflow

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run
```
Note: `npm run lint` will fail this job until plan 003 lands (4 known errors).
That is intentional — it makes the lint debt visible in CI. If the operator
wants CI green immediately, they can land 003 first or temporarily set the lint
step to `continue-on-error: true` with a comment. Do not silently drop the lint
step.

**Verify**: `npx tsc --noEmit` exit 0; the YAML is valid
(`node -e "require('js-yaml')" ` is not available — instead confirm indentation
matches the example exactly).

## Test plan

- New file `lib/mcp-parsing.test.ts`: ≥ 12 tests across the 8 exported
  functions — happy path + empty/malformed + the 6-item cap.
- New file `lib/utils.test.ts`: 2–3 tests for `cn`.
- No existing unit test to model after (this is the first) — follow the Vitest
  `describe`/`it`/`expect` style shown in the Vitest docs.
- Verification: `npx vitest run` → all pass, ≥ 14 tests total.

## Done criteria

ALL must hold:

- [ ] `npx vitest run` exits 0 with ≥ 14 passing tests
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0 (the new test files are excluded from the build)
- [ ] `vitest`, `vitest.config.ts`, `lib/mcp-parsing.test.ts`,
      `lib/utils.test.ts`, `.github/workflows/ci.yml` all exist
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report (do not improvise) if:

- `lib/mcp-parsing.ts` exports differ from the "Current state" list (the file
  was refactored — likely by plan 005 landing first; re-sequence).
- Vitest cannot resolve the `@/*` alias after Step 2 (config mismatch — report
  the error; do not start sprinkling relative imports as a workaround).
- A parsing function throws on malformed input where the test expected a safe
  empty return — that is a *real bug* worth a separate finding; record it and
  keep the test as `it.fails(...)` or skip with a note, don't "fix" the source
  (out of scope).

## Maintenance notes

- When plan 005 extracts pure helpers from `app/api/chat/route.ts` into
  `lib/kira/*`, those modules become importable and should get their own
  `*.test.ts` files using this same harness.
- If the team later adds a component-test layer, switch `environment` to
  `jsdom` per-file via a Vitest comment rather than globally (keeps these node
  tests fast).
- A reviewer should confirm CI actually runs (check the Actions tab on first
  push) and that the lint step's red status is understood, not ignored.
