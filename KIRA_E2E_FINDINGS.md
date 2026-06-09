# Kira — E2E Test Expansion & Findings

_Prepared: 2026-06-07 · Scope: expand personas to 100, full e2e + harness review, fix the safe issues._

## TL;DR

- **Persona suite expanded 50 → 100** (`scripts/test-personas.mjs`), now covering every feature, not just vague/out-of-scope chat.
- **Found 16 issues.** Fixed the 8 safe ones (5 harness + 3 server/docs). Flagged 8 for your call (2 are genuine P1 risks that need a design decision).
- **The most important finding is in the test harness itself:** the old suite scored rate-limit fallbacks as **passes**, so green runs were not trustworthy. That is now fixed.
- **I could not run the 100 personas live from here** — this sandbox is network-blocked from your dev server, Groq, and `mcp.kapruka.com`. Run command + expected results are below; run it on your machine.
- Verified: `tsc --noEmit` clean, ESLint clean (1 pre-existing warning), suite parses, and the fallback-detector self-test catches all 7 real fallback strings (en/si/ta) with no false positives.

---

## 1. The 100 personas

Run on your machine (dev server up, `GROQ_API_KEY` set):

```bash
npm run dev                                    # terminal 1
node scripts/test-personas.mjs                 # terminal 2 — concurrency defaults to 1
node scripts/test-personas.mjs --group c       # one group: a|b|c|d|e
node scripts/test-personas.mjs --id C19,D02    # specific personas
```

| Group | N | Focus |
|---|---|---|
| A | 25 | Vague / indirect gifts — must ask, never "nothing found" |
| B | 25 | Out-of-scope — warm redirect, **zero** tool calls |
| C | 25 | Feature / transactional: search, sort, budget, delivery, **checkout (cart + multi-turn)**, tracking (alnum/numeric/none), re-show, more-options, browse, spelling correction |
| D | 12 | Multilingual: Sinhala/Tamil output gating, Unicode + romanized input, **mode-vs-script precedence** |
| E | 13 | Adversarial / edge: prompt injection, jailbreak, trust, gibberish, ~720-char input, emoji-only, SQLi-style, mixed scripts |

New capabilities added to the runner so these can run **end-to-end** (not just one-liners):

- Personas can carry a full `request` (multi-message history, `cart`, `language`) — e.g. C19 sends a cart then `"ready to checkout"`; C16/C17 send a prior assistant turn then `"show me"` / `"more options"`.
- A small declarative check vocabulary: `products`, `noProducts`, `productsOrHonestEmpty`, `delivery`, `tracking`, `noTools`, `noHallucination`, `["text", /re/]`, `["noText", /re/]`, `["lang","si"]`, `["noLang","ta"]`.

### How to read results — important

Results are **PASS / FAIL / ERR**. `ERR` = a rate-limit / connection / fallback response (the model never actually ran). ERRs are **excluded from the pass count**, reported separately, and **retried once automatically**. The process exit code is driven only by *genuine* failures, so a Groq blip won't red-flag the run. If you see lots of ERR, you're being rate-limited — re-run, keep concurrency at 1.

---

## 2. Issues found

Severity uses your own scale (P0 blocker · P1 major · P2 minor · P3 polish).

### Fixed now (safe)

| # | Sev | Issue | Fix |
|---|---|---|---|
| H1 | P1 | **Harness scored fallbacks as PASS.** Rate-limit/timeout/"trouble connecting" replies stream as normal 200s, so `evaluateA/B` saw non-empty text + no tools and passed them. `scripts/persona-results.json` literally shows `A11` "passed" with the *"I'm a bit slammed"* text. Green runs were not trustworthy. | Added `SENTINEL_RE` gate (en/si/ta) → such replies score **ERR**, excluded from pass count, auto-retried once. |
| H2 | P1 | **`expect:"ask"` never enforced a question.** The branch that should fail an ask-case with no question was a comment-only no-op, so a non-asking reply passed — contradicting the documented criteria. | `evaluateA` now fails ask-cases that neither ask a `?` nor use a clarifying phrase (and still fails if products shown). |
| H3 | P2 | **Default concurrency was 5**, directly contradicting the "always use 1" guidance and guaranteeing rate-limit noise. | Default is now **1**; warns if you override higher. |
| H4 | P2 | **No pacing/retry** in the persona runner (core suite waits 2s between calls; persona suite waited 0). | 1.2s spacing between requests + one automatic retry on a fallback. |
| H5 | P2 | **Single-message only** — couldn't exercise checkout field-collection, re-show, more-options, delivery follow-up, or language modes end-to-end. | Personas can now carry a full `request` (multi-turn, cart, language). |
| S3 | P2 | **Numeric-only order numbers couldn't be tracked.** `extractOrderNumber` required a letter+digit, so `track order 10234567` fell through to "send me the order number" forever. | Now accepts alphanumeric-with-digit, else a pure-numeric token; never treats plain words ("track","order") as an ID. (`app/api/chat/route.ts`) |
| S5 | P2 | **Product extraction was brittle.** `extractProductsFromMcp` only read `inner.results`, but `truncateForModel` reads `products ?? results ?? items` — an MCP field rename would silently empty the carousel while the model still "saw" products. | `extractProductsFromMcp` now tolerates `results / products / items / data`. (`lib/mcp-parsing.ts`) |
| S8 | P2 | **Stale "today" in the prompt.** `KIRA_SYSTEM_PROMPT` bakes `new Date()` at module-load; after a cold start the checkout date logic drifts. | Inject an authoritative `[CURRENT DATE: …]` line into the system message **per request**. (`app/api/chat/route.ts`) |
| S4 | P3 | Doc/code drift: docs said "up to 5 tool rounds"; `MAX_TOOL_ROUNDS = 4`. | Docs corrected to 4. |

### Flagged — needs your decision (not auto-fixed)

| # | Sev | Issue | Why I didn't touch it / suggestion |
|---|---|---|---|
| S1 | **P1** | **Streaming bypasses the hallucination stop-hook.** The retry-on-hallucination only fires when `!streamedText`, but tokens are streamed as they arrive, so by the time `finalText` is checked `streamedText` is already `true`. In the normal path the hook is effectively dead — anti-hallucination rests on the prompt + last-model intercept + the language guard. | Real fix needs buffering the first ~N tokens (or first sentence) before committing to the wire so the check can still fire, at a small latency cost. Worth a deliberate design choice. |
| S2 | **P1** | **EN-mode language guard nukes the whole reply** if it contains *any* Sinhala/Tamil character — replacing a correct answer with *"trouble reaching Kapruka."* Kapruka has Sinhala-script product names, so a correct reply that quotes one gets destroyed. | Strip the offending run, or whitelist product-name spans, instead of full replacement. Needs testing against real catalog names. |
| S6 | P3 | Server emits `context:{budget}` SSE that the client ignores (it only reads `ctx.city`) — the budget chip never renders. | Either render it in `app/page.tsx` or drop the emit. |
| S7 | P3 | Deterministic tracking needs "order"/"delivery"; "track my **package/parcel/shipment**" falls through to the LLM. | Add those nouns to the tracking trigger. |
| C1 | P3 | On `done` with no streamed text and no error, the client shows a generic error even if products/tracking arrived. Latent only (server always streams text today). | Guard the `done` branch on "did we receive any payload?" |
| C2 | P3 | ESLint: unused `usedQuery` in the search loop (`route.ts`). Pre-existing. | One-line cleanup. |
| — | P3 | `noHallucinatedProducts` repeated-listing regex can false-positive on legitimate "a cake … a hamper …" prose. | Tighten if you see false fails. |
| — | P2 | The **core** suite (`run-tests.mjs` / `evaluate.mjs`) has the same blind spot as H1 for `notEmpty`-only tests — a fallback passes `notEmpty`. | Port the `SENTINEL_RE` gate into `evaluate.mjs` too (I left the core suite untouched to keep the change surface small; say the word and I'll mirror it). |

---

## 3. What I verified

- `node_modules/.bin/tsc --noEmit` → **0 errors**.
- ESLint on changed files → **0 errors** (1 pre-existing `usedQuery` warning).
- `node --check scripts/test-personas.mjs` → OK; **100 unique IDs** (A25/B25/C25/D12/E13).
- Self-test: the `SENTINEL_RE` fallback detector catches all **7** real fallback strings (en + si + ta) with **0** false positives on good replies; the new `extractOrderNumber` returns `KP12345AB`→`KP12345AB`, `10234567`→`10234567`, `"track my order please"`→`undefined`.

## 4. What I could NOT do

This sandbox is network-blocked from `localhost:3000`, `api.groq.com`, and `mcp.kapruka.com` (all return *"Connection blocked by network allowlist"*), so the **live** 100-persona run has to happen on your machine. Everything above is from static analysis + the verifications listed. Once you run the suite, paste me the `scripts/persona-results.json` and I'll triage the genuine FAILs (vs ERR rate-limit noise) and tackle the two P1s (S1, S2) if you want.

## 5. Files changed

- `scripts/test-personas.mjs` — 50 → 100 personas, ERR scoring, ask-enforcement, multi-turn/cart/language support, concurrency=1 default, pacing+retry.
- `app/api/chat/route.ts` — numeric order numbers (S3), per-request date (S8).
- `lib/mcp-parsing.ts` — tolerant product extraction (S5).
- `CLAUDE.md`, `docs/TESTING.md` — doc sync (persona count, tool-round count, new groups, scoring).
