# Dulith QA Program

Autonomous quality loop: **plan → Dulith approval → edge suite → fix until ≥90%**.

Each domain follows the same pattern as search routing (Group S) — no regex whack-a-mole, architectural fixes + automated gates.

## Domains

| ID | Group | Cases | Failure class |
|----|-------|------:|---------------|
| search-routing | S | 200 | Multi-category combos → wrong carousel (flower-themed cakes) |
| category-purity | T | ~120 | Single-category search → junk SKUs (pens, cards, toppers) |
| context-bleed | U | ~80 | Follow-up search uses **prior** turn category |
| vague-intent | V | ~60 | Zero-context message → premature product carousel |
| repair-flow | W | ~60 | Angry partner → preachy "hand deliver" instead of Kapruka |
| breakup-repair | Y | 500 | Breakup + flowers → missing hand-deliver tone / flower junk (en/si/ta) |
| multilingual-2500 | Z | 2500 | Five language modes × 500 — reply contract + everyday shopper |
| one-tap-reorder | X | ~60 | Reorder hidden in chat — no one-tap habit loop (CEO #1 ask) |

## Workflow per domain

1. Read plan in `docs/*-PLAN.md`
2. `node scripts/dulith-plan-review.mjs --domain <id>` → must score **≥9/10**
3. `node scripts/generate-<domain>.mjs` → refresh persona group
4. `node scripts/test-personas.mjs --group <letter>` → persona + CEO lens
5. Fix highest-impact failure cluster; re-run until **≥90%** persona + CEO

## Master orchestrator

```bash
npx next dev --port 3107
export KIRA_API_URL=http://localhost:3107/api/chat

npm run test:dulith-plans          # review ALL domain plans
npm run test:dulith-qa:smoke       # smoke each domain (~15–25 cases)
npm run test:dulith-qa             # full program (S+T+U+V+W+X+Y)
npm run test:dulith-breakup:supervisor  # Group Y only — 500 en/si/ta breakup/repair
npm run test:z-2500:supervisor        # Group Z — 2500 (5×500 blocks, Dulith gate)
npm run test:z-2500:supervisor:smoke    # Group Z smoke — 125 fast
npm run test:z-block -- --lang si       # Single 500-block re-run
```

Output: `test-results/dulith-qa/summary.json`

## Auto-approval rule

Plans are **auto-approved by Dulith heuristic** at ≥9/10 — no human gate. Implementation loops until every domain hits ≥90% persona pass and ≥90% CEO lens pass.

## Non-goals

- Per-phrasing regex for every user variant
- Manual QA only (every domain must have generated edge cases)
- Skipping CEO lens on edge suites
