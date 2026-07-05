# Multilingual 2500 Master Plan — Group Z (Dulith-run)

**Owner:** Dulith (CEO / founder evaluator). Dulith reviews this plan, approves it at ≥9/10,
supervises every run, reads every response through the CEO lens, orders fixes, and re-runs
until the standard is met. Nothing ships until Dulith's gate is green.

**Trigger:** Kapruka Agent Challenge approval email (applicant **F8QYZ**, 2 Jul 2026).
The brief is explicit: agents that win "feel human, surprising, and genuinely helpful",
the **everyday shopper buying for their own needs is the main user** (not just gifting),
and **Sinhala / Tanglish especially makes you stand out**. Demos are tested daily by a
real human at Kapruka — every language and every mood has to hold up.

## Problem / root cause

Our QA coverage is deep but lopsided. Group Y proved the breakup/repair failure class in
en/si/ta, but the wider catalogue of real-life scenarios (everyday groceries, electronics,
fashion, delivery dates, multi-item carts, gift notes, checkout, reorder) has never been
stress-tested at scale in **five language modes**. The known failure classes, per language:

| Language mode | Script | Failure class we expect to catch |
|---|---|---|
| English (en) | Latin | Generic search-box tone, no opinion/personality, premature carousels |
| Sinhala (si) | සිංහල Unicode | Reply-language bugs, broken Sinhala grammar, English leaking mid-sentence |
| Tamil (ta) | தமிழ் Unicode | Tamil script not recognised → wrong-language reply or dead-end |
| Singlish | Romanized Sinhala-English mix | **Must NOT trigger Sinhala-script reply** (prompt gates Sinhala strictly on Unicode script); must still feel local, not corporate |
| Tanglish | Romanized Tamil-English mix | Same gate: English reply with local flavour, no Tamil-script hallucination, no intent loss |

Why regex-only fixes fail (the whack-a-mole bug we refuse to repeat): romanized Singlish
and Tanglish have unbounded spelling variance ("mata", "matta", "onna", "oney", "venum",
"wenum"). Patching per phrasing is a losing strategy. The fix layer must be architectural —
language-mode detection route + intent extraction that is script-aware, with the persona
suite as the regression net.

## Strategy (layered, architectural)

1. **Detection layer** — classify each incoming message into one of the 5 modes
   (Unicode-script check first, then romanized-marker heuristic). This is a route/handler
   decision, not a per-phrase patch. See `scripts/lib/language-mode.mjs`.
2. **Response-language contract** — si → Sinhala script reply; ta → Tamil-aware reply;
   en / Singlish / Tanglish → English reply with warm local flavour (Aiyo/machang register
   where it fits). The contract is asserted by automated checks, not eyeballs.
3. **Scenario coverage** — identical 500-case scenario mix per language so cross-language
   diffs isolate language bugs from logic bugs.
4. **Dulith loop** — every response scored; failures clustered; highest-impact cluster
   fixed first; re-run; repeat until gate.

## The suite — Group Z, 2,500 generated persona cases

`scripts/generate-multilingual-2500.mjs` → `scripts/personas/generated-multilingual.mjs`
(same generator pattern as Group Y). **500 cases per language mode**, identical scenario
mix, IDs `Z0001–Z2500` (en `Z0001–Z0500`, si `Z0501–Z1000`, ta `Z1001–Z1500`,
singlish `Z1501–Z2000`, tanglish `Z2001–Z2500`).

Scenario mix per 500 (mirrors the challenge email's judging signals):

| # | Scenario family | Cases | What Dulith checks |
|---|---|---:|---|
| 1 | Everyday shopper — groceries, essentials, self-purchase | 90 | Products relevant, no gift-tone forced on a rice-and-dhal order |
| 2 | Electronics / fashion / home for myself | 60 | Category purity, no junk SKUs, honest empty state |
| 3 | Gifting + budget + city ("gift under 5000 to Kandy") | 60 | Budget respected, city acknowledged, warm intro |
| 4 | Breakup / repair emotional (the email's own example) | 50 | Aiyo tone, hand-deliver plan, note-card offer, no preachiness |
| 5 | Delivery-date handling ("need it by Friday in Galle") | 45 | Delivery quote / next-available date surfaced |
| 6 | Multi-item cart building ("add a cake and flowers and a card") | 45 | Multi-add works, tray reflects all items |
| 7 | Gift messaging / note card | 35 | Note captured or offered |
| 8 | Checkout + COD + payment link | 35 | Checkout flow completes, no dead ends |
| 9 | Tracking + one-tap reorder | 30 | KP-ref tracked, reorder honoured |
| 10 | Vague intent ("I need something…") | 25 | Clarifying question, no premature carousel |
| 11 | Trust / jailbreak / out-of-scope traps | 25 | In-character redirect, no prompt leak, no tool markup |

Every case carries persona `checks` (noToolLeak, noFamilyUnsafe, productsOrHonestEmpty,
plus a **replyLanguage check** new to Group Z) and is scored by the CEO lens
(`scripts/ceo-lens.mjs`) — that is Dulith reading every single response and rating it.

## Dulith's operating loop (he runs everything)

```
Phase 0  Plan gate      node scripts/dulith-plan-review.mjs --domain multilingual-2500   (≥9/10 or revise this doc)
Phase 1  Generate       node scripts/generate-multilingual-2500.mjs                      (2500 personas, 500/lang)
Phase 2  Smoke          orchestrator --smoke → 25 cases/language (125 total)             (fail fast before burning hours)
Phase 3  Language gates run one 500-block at a time: en → si → ta → singlish → tanglish
Phase 4  Dulith review  CEO lens scores EVERY response; failures clustered by reason
Phase 5  Fix loop       fix biggest cluster architecturally → re-run failed IDs → full block re-run
Phase 6  Gate           block passes when persona ≥90% AND CEO lens ≥90% on ALL 500
Phase 7  Aggregate gate all 5 blocks ≥90%/≥90% on all 2500 → Dulith verdict APPROVED → proceed to final gate + submission
```

A block that fails its gate loops Phases 4–6. **No block is skipped, no failure is waved
through** — Dulith's verdict file (`test-results/dulith-multilingual/summary.json`)
records per-block persona %, CEO %, top-20 failure clusters, and the fix log.

## Success criteria (live repro targets)

- **Target:** persona pass ≥90% AND CEO lens ≥90% **per language block** and aggregate,
  measured on all 2,500 cases (not a sample).
- Zero prompt leaks, zero tool-markup leaks, zero family-unsafe products across the run.
- Reply-language contract: 100% — si gets Sinhala script, Singlish/Tanglish never do.
- Live repro spot-check: 5 manual production probes per language after the gate passes.

## Ops constraints (why the run is shaped this way)

- **Groq free tier ~30 RPM** → `--concurrency 1` always; key rotation via
  `GROQ_API_KEY(_2,_3)` already round-robins. A 500 block ≈ 1.5–2.5 h; full 2,500 ≈ 8–12 h.
  Run blocks sequentially (overnight-friendly), checkpoint per 20-ID batch like the
  existing orchestrator so a crash resumes, never restarts.
- **Kapruka MCP: 60 req/min/IP, 30-min read cache** → no polling, no retry loops; the
  2.2 s inter-batch delay stays.
- Run against production URL (`KIRA_API_URL=https://kira-peach.vercel.app/api/chat`) so
  results match what the Kapruka judges test daily.

## Explicitly do NOT

- Do NOT patch per-phrasing regex for romanized variants — detection layer only.
- Do NOT lower the 90% bar or shrink block size to pass faster.
- Do NOT let Sinhala-script replies fire on Singlish/Tanglish input — that gate is strict.
- Do NOT run concurrency >1 against Groq free tier (timeouts masquerade as bugs).
- Do NOT skip CEO lens on any response — Dulith reviews all 2,500, every iteration.
- Do NOT mark the program done while any block is <90% — the loop continues until standard.

## Build list (implemented)

1. `scripts/generate-multilingual-2500.mjs` — Group Z generator
2. `replyLanguage` check in the persona evaluator (script-detection assert)
3. `multilingual-2500` domain in `scripts/dulith-domains.mjs`
4. `scripts/dulith-multilingual-supervisor.mjs` — block-by-block runner + verdict file
5. npm scripts: `test:z-2500`, `test:z-2500:smoke`, `test:z-block -- --lang si`
