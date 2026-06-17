# Plan 005: Decompose the 2,681-line `app/api/chat/route.ts` into focused `lib/kira/*` modules, behavior unchanged

> **Executor instructions**: This is a mechanical **extract-and-re-export**
> refactor. The behavior of `/api/chat` must be **identical** before and after.
> Move code in the staged order below; after EVERY stage run the full
> verification gate and confirm green before continuing. If anything in "STOP
> conditions" occurs, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7945c29..HEAD -- app/api/chat/route.ts`
> If `route.ts` differs structurally from the inventory below, re-map symbols to
> their current locations before moving anything. **Do not start without a
> green test gate** (see Depends on).

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/001-test-harness-and-ci.md` (the Vitest harness — this
  plan writes characterization tests against the extracted pure modules and
  needs the runner + CI gate in place first)
- **Category**: tech-debt
- **Planned at**: commit `7945c29`, 2026-06-11

## Why this matters

`app/api/chat/route.ts` is **2,681 lines** and is the single highest-churn file
in the repo (present in nearly every recent commit). It mixes at least five
unrelated concerns in one file: a ~240-line localization dictionary, Groq tool-
schema massaging, context-window arithmetic, ~20 deterministic fast-path
handlers with their regexes and parsers, and the streaming agentic loop. The
consequences are concrete: the pure logic (query parsing, order-number
extraction, schema coercion, compaction) is **untestable in isolation** because
it's module-private inside a route file; code review of any change requires
paging through thousands of unrelated lines; and merge conflicts are frequent.
Splitting it into cohesive `lib/kira/*` modules makes each piece independently
testable (this plan adds those tests), reviewable, and reusable — without
changing any runtime behavior.

## Current state

`app/api/chat/route.ts` exports a single `POST` handler. The symbols to extract
(all currently in this one file) and their destinations:

| Destination module | Symbols to move (currently in route.ts) |
|---|---|
| `lib/kira/localization.ts` | `LS` dict, `L`, `Lf` |
| `lib/kira/sse.ts` | `enc`, `sse`, `streamWords`, `TOOL_STEPS`, `TOOL_SUMMARY_LABELS` |
| `lib/kira/context.ts` | `MODEL_CONTEXT_LIMITS`, `OUTPUT_TOKEN_RESERVE`, `TRIM_TRIGGER_PCT`, `TRIM_TARGET_PCT`, `trimContextIfNeeded`, `buildCompactSummary` |
| `lib/kira/groq-schema.ts` | `relaxSchema`, `resolveSchema`, `coerceArgTypes` (note: `relaxSchema`/`resolveSchema` are currently **nested inside `POST`** — lift them to module scope as part of the move; they are pure) |
| `lib/kira/search.ts` (shared constants + pure parsers) | `SERVER_CITY_REGEX`, `CATEGORY_RELEVANCE_TERMS`, `CATEGORY_IRRELEVANCE_TERMS`, `CATEGORY_QUERY_MAP`, `BAKERY_BRANDS`, `SEARCH_SPELLING_MAP`, `parseSearchIntent`, `normalizeProductQuery`, `fallbackQuery`, `extractCityHint`, `extractFirstCity`, `extractOrderNumber`, `extractProductKeyword`, `dedupeProducts`, `cartItemsToProducts`, `extractLastSearchContext` |
| `lib/kira/tool-summary.ts` | `generateToolSummary`, `truncateForModel`, `CONCURRENT_SAFE_TOOLS` |
| `lib/kira/fast-paths.ts` | `tryHandleDeterministicPrompt` + all its local regexes (`RESHOW_RE`, `ADD_TO_CART_RE`, `LIST_AS_TEXT_RE`, `RESHOW_AS_CARDS_RE`, `RESHOW_THOSE_RE`, `REORDER_*`, `REPAIR_*`, `RUSH_RE`, `SALE_RE`, `HAMPER_RE`, `GLOBAL_SHOP_RE`, gift-intent regexes, etc.) + `productsFromTrackingItems` |
| `app/api/chat/route.ts` (stays) | `POST`, the streaming agentic loop, `executeToolCalls`/`executeSingleTool`, `getGroq`, `getGroq`-using helpers, `MODELS`, `MAX_TOOL_ROUNDS`, `JSON_FORMAT_TOOLS` |

**Critical sharing note** — some constants/parsers are used by BOTH the
fast-paths AND the main loop / executeSingleTool:
- `CATEGORY_RELEVANCE_TERMS` / `CATEGORY_IRRELEVANCE_TERMS` — used in
  `executeSingleTool` (main loop) and in fast-paths.
- `SEARCH_SPELLING_MAP` — used in `executeSingleTool`.
- `SERVER_CITY_REGEX` — used in `buildCompactSummary` (context) and fast-paths.
- `coerceArgTypes` — used in `executeSingleTool`.
- `truncateForModel`, `CONCURRENT_SAFE_TOOLS`, `generateToolSummary` — used in
  `executeToolCalls`.
- `L`/`Lf`/`sse`/`streamWords`/`TOOL_STEPS` — used everywhere.
These MUST live in a shared module and be imported by both sides. That is why
shared constants/parsers go in `lib/kira/search.ts` (not inside `fast-paths.ts`).

**Conventions**: TypeScript strict, `@/*` alias → repo root, named exports,
2-space indent. `tryHandleDeterministicPrompt` already takes `controller` and
`mcpClient` as parameters (it does not close over `POST`'s locals beyond the
module-level symbols above), which makes it cleanly extractable once its
dependencies are importable.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`            | exit 0              |
| Lint      | `npm run lint`                | no NEW errors vs baseline |
| Unit test | `npx vitest run`              | all pass            |
| Build     | `npm run build`               | exit 0              |
| Behavior  | `npm run dev` + curl (Step V) | identical responses |

## Suggested executor toolkit

- This is a move refactor — prefer cut/paste of whole symbol bodies over
  rewriting. Changing logic while moving is the main risk; don't.
- Keep the diff reviewable: one module extraction per commit.

## Scope

**In scope** (create the new modules; trim `route.ts` to import them):
- `lib/kira/localization.ts`, `lib/kira/sse.ts`, `lib/kira/context.ts`,
  `lib/kira/groq-schema.ts`, `lib/kira/search.ts`, `lib/kira/tool-summary.ts`,
  `lib/kira/fast-paths.ts` (all create)
- `app/api/chat/route.ts` (trim — replace moved code with imports)
- `lib/kira/*.test.ts` for the pure modules (create)

**Out of scope** (do NOT touch):
- `lib/mcp-parsing.ts`, `lib/mcp-client.ts` — already separate; the new modules
  import from them, don't modify them.
- `app/api/checkout/route.ts` and other routes.
- Any *behavior* change: same regexes, same thresholds, same outputs. If you
  spot a bug while moving code, **do not fix it here** — note it for a separate
  finding.
- The `lib/kira/` directory must not import from `app/` (keep the dependency
  direction one-way: `app/` → `lib/`).

## Git workflow

- Branch: `advisor/005-split-chat-route`
- One commit per stage below (so each is independently reviewable/revertible):
  `refactor: extract <module> from chat route`.
- Do NOT push or open a PR unless instructed.

## Steps

Extract leaf-pure modules first (no dependencies on other new modules), verify
green, then the modules that depend on them, then the fast-paths last.

### Stage 1 — `lib/kira/localization.ts`
Move `LS`, `L`, `Lf`. Export them. In `route.ts`, delete the originals and add
`import { L, Lf } from "@/lib/kira/localization";`.
**Verify**: `npx tsc --noEmit` exit 0; `npm run build` exit 0.

### Stage 2 — `lib/kira/sse.ts`
Move `enc`, `sse`, `streamWords`, `TOOL_STEPS`, `TOOL_SUMMARY_LABELS`. Import
back into `route.ts`.
**Verify**: tsc + build green.

### Stage 3 — `lib/kira/groq-schema.ts`
Lift `relaxSchema` and `resolveSchema` out of the `POST` closure to module scope
(they are pure), move them + `coerceArgTypes` here. Update the call sites in
`POST`/`executeSingleTool` to import these.
**Verify**: tsc + build green.

### Stage 4 — `lib/kira/context.ts`
Move `MODEL_CONTEXT_LIMITS`, `OUTPUT_TOKEN_RESERVE`, `TRIM_*`,
`trimContextIfNeeded`, `buildCompactSummary`. Import back.
**Verify**: tsc + build green.

### Stage 5 — `lib/kira/search.ts`
Move the shared constants and pure parsers listed in the inventory. This module
is imported by BOTH `route.ts` (executeSingleTool) and the future
`fast-paths.ts`. Update all references in `route.ts`.
**Verify**: tsc + build green.

### Stage 6 — `lib/kira/tool-summary.ts`
Move `generateToolSummary`, `truncateForModel`, `CONCURRENT_SAFE_TOOLS`.
`generateToolSummary` uses Groq — pass the `getGroq()` client in as a parameter
OR import a shared `getGroq` (keep `getGroq` in `route.ts` and pass the client,
to avoid two Groq singletons). Decide and keep it to ONE Groq client.
**Verify**: tsc + build green.

### Stage 7 — `lib/kira/fast-paths.ts` (last, largest)
Move `tryHandleDeterministicPrompt` and its local regexes + `productsFromTrackingItems`.
It imports from `localization`, `sse`, `search`, `mcp-client`, `mcp-parsing`.
Replace the body in `route.ts` with `import { tryHandleDeterministicPrompt } from "@/lib/kira/fast-paths";`.
Confirm there are no import cycles (`fast-paths` must not import `route.ts`).
**Verify**: tsc + build green; `npm run lint` shows no NEW errors.

### Step V — Behavioral parity check (after all stages)
Start `npm run dev`. With a valid `GROQ_API_KEY`, send a few representative
messages and confirm responses match pre-refactor behavior:
- `curl -s -XPOST localhost:3000/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"is kapruka legit?"}],"cart":[]}'`
  → streams the trust-affirmation text (a deterministic fast-path — no Groq
  needed, so this works even without a key).
- `... -d '{"messages":[{"role":"user","content":"track order KP12345"}],"cart":[]}'`
  → streams a tracking step + result.
- `... -d '{"messages":[{"role":"user","content":""}],"cart":[]}'`
  → streams the empty-input greeting.
These exercise fast-paths (no Groq budget needed). Confirm output is unchanged
from `main`/pre-refactor.

## Test plan

As each pure module lands (Stages 1, 3, 4, 5, 6), add a characterization test
file using the plan-001 Vitest harness:
- `lib/kira/search.test.ts` — the highest value: `parseSearchIntent` (search vs
  non-search inputs, budget extraction, referential rejection),
  `extractOrderNumber` (alphanumeric preferred, numeric fallback, plain words
  rejected), `extractCityHint`, `normalizeProductQuery`, `fallbackQuery`,
  `dedupeProducts`. ≥ 15 tests.
- `lib/kira/groq-schema.test.ts` — `coerceArgTypes` (string→int/number/bool,
  anyOf handling), `relaxSchema` (enum stripped, numeric widened). ≥ 6 tests.
- `lib/kira/localization.test.ts` — `L` fallback to `en`/key, `Lf` var
  substitution. ≥ 3 tests.
- `lib/kira/context.test.ts` — `buildCompactSummary` (extracts budget/city/
  occasion/recipient), `trimContextIfNeeded` (no-op under threshold, trims over).
  ≥ 4 tests.
These tests are written against the **current** behavior (characterization) —
their job is to lock behavior so the move provably changed nothing. Model their
structure after `lib/mcp-parsing.test.ts` from plan 001.
Verification: `npx vitest run` → all pass, ≥ 28 new tests.

## Done criteria

ALL must hold:

- [ ] `app/api/chat/route.ts` is under ~900 lines and contains only the handler
      + agentic loop + tool execution (no `LS` dict, no fast-path regexes, no
      pure parsers)
- [ ] All 7 `lib/kira/*` modules exist and are imported by `route.ts`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] `npx vitest run` passes with ≥ 28 new tests across the `lib/kira/*` modules
- [ ] `npm run lint` introduces **no new errors** vs the pre-plan baseline
- [ ] Step V behavioral checks produce identical output to pre-refactor
- [ ] No `lib/kira/*` file imports from `app/` (one-way dependency)
- [ ] `plans/README.md` status row for 005 updated

## STOP conditions

Stop and report (do not improvise) if:

- An **import cycle** appears (e.g. `tsc` or the build reports a circular
  dependency, or a module needs to import `route.ts`). Re-evaluate the split —
  a shared symbol probably needs to move to `search.ts` or a new
  `lib/kira/constants.ts`.
- A moved symbol turns out to **close over a `POST`-local variable** (not just
  module-level symbols) — it can't be extracted as-is; report which one.
- Behavioral parity (Step V) **differs** from pre-refactor for any probe — a
  move changed behavior; revert that stage and report.
- You find a latent bug while moving code — record it as a new finding; do NOT
  fix it inside this refactor (it would mask the parity check).
- The `route.ts` structure has drifted so far from the inventory that the
  symbol map is wrong — report before moving anything.

## Maintenance notes

- After this lands, new fast-paths go in `lib/kira/fast-paths.ts`, new localized
  strings in `lib/kira/localization.ts`, etc. — keep `route.ts` thin.
- The `lib/kira/*` pure modules are now the natural home for the broader test
  coverage; expanding their tests is cheap and high-value.
- A reviewer should diff each stage commit against the prior to confirm it is a
  pure move (no logic edits) — the parity probe in Step V is the backstop, but
  per-stage review is what makes the MED risk acceptable.
- If plan 002 (rate limiting) lands first, it adds `middleware.ts` and does not
  touch `route.ts` internals — no conflict.
