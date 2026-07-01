# Kira Testing Runbook

Kira's automated checks intentionally verify the app identity before they run. Start Kira on the dedicated judge/test port and point the API suites at that port:

```bash
npx next dev --port 3107
$env:KIRA_API_URL = "http://localhost:3107/api/chat"
```

The preflight in `scripts/test-runner.mjs` calls `/api/health` and requires `{ app: "kira" }`, then probes `/api/chat` for an SSE response. This prevents test runs from accidentally hitting another local Next app.

---

## Core Feature Suite

`scripts/test-suite.mjs` currently contains **62** automated checks covering language modes, deterministic search, delivery, checkout, tracking, reorder, personality, breadth fast-paths, edge cases, and direct `/api/checkout` validation.

```bash
node scripts/run-tests.mjs          # all 62
node scripts/judge-dry-run.mjs      # 10-step judge path
node scripts/run-tests.mjs --id 52  # single test
```

Results are written to `test-results/results.json`.

| Group | Tests | Notes |
|---|---:|---|
| `language / en-mode` | 11 | English + Sri Lankan casual phrasing |
| `language / si-mode` | 5 | Sinhala Unicode input/output |
| `language / ta-mode` | 5 | Tamil Unicode input/output |
| `language / lang-edge` | 3 | Mode-vs-script edge cases |
| `feature / deterministic` | 5 | Fast-path intercepts |
| `feature / search` | 5 | Product search + filters |
| `feature / delivery` | 5 | Delivery checks and city resolution |
| `feature / checkout` | 4 | Conversational checkout field collection |
| `feature / tracking` | 2 | Order tracking |
| `feature / edge` | 4 | Hallucination guard, long input, cart edge |
| `feature / checkout-api` | 4 | Missing cart, phone, address, and date validation |

---

## Persona Suite

`scripts/test-personas.mjs` runs **902+** judge-style personas (A–G curated + H–M generated + **S–W Dulith edge domains**):

- **Group A (25)** — vague or indirect gift prompts.
- **Group B (25)** — out-of-scope prompts.
- **Group C (25)** — transactional flows: search, delivery, checkout, tracking, browse, sort, spelling correction.
- **Group D (12)** — Sinhala/Tamil/language-mode prompts.
- **Group E (13)** — adversarial and edge prompts.
- **Group F (24)** — judge-path regressions.
- **Group G (45)** — founder/friend delivery.
- **Groups H–M (335)** — storefront, multilingual depth, checkout E2E, reorder, messy inputs, CEO gold paths.

```bash
node scripts/generate-personas.mjs                # refresh H–M from templates
node scripts/test-personas.mjs                      # all 502
node scripts/test-personas.mjs --group m            # CEO gold paths
node scripts/test-personas.mjs --id C20,F07,M12     # specific IDs
node scripts/test-personas.mjs --concurrency 1      # explicit default (required on Groq free tier)
```

### CEO 500 gate (target ≥90% persona + CEO score)

```bash
npx next dev --port 3107
export KIRA_API_URL=http://localhost:3107/api/chat
npm run test:ceo-smoke          # 50-persona smoke batch
npm run test:ceo-500            # full 502 run
node scripts/ceo-500-orchestrator.mjs --shard 1/5  # parallel shards
node scripts/ceo-score-all.mjs --from test-results/ceo-500/results.json --llm --below 90
```

Results: `test-results/ceo-500/summary.json`, `triage.json` (failure clusters for fix loop).

### Dulith QA Program (domains S–W)

Five founder-gated domains — each has a plan doc, auto-approval at ≥9/10, and an edge suite:

| Domain | Group | Plan | Generator |
|--------|-------|------|-----------|
| Search routing | S | `docs/SEARCH-ROUTING-PLAN.md` | `generate-search-edge.mjs` |
| Category purity | T | `docs/CATEGORY-PURITY-PLAN.md` | `generate-category-purity.mjs` |
| Context bleed | U | `docs/CONTEXT-BLEED-PLAN.md` | `generate-context-bleed.mjs` |
| Vague intent | V | `docs/VAGUE-INTENT-PLAN.md` | `generate-vague-intent.mjs` |
| Repair flow | W | `docs/REPAIR-FLOW-PLAN.md` | `generate-repair-flow.mjs` |

```bash
npm run test:dulith-plans       # approve all domain plans (≥9/10 gate)
npm run test:dulith-qa:smoke    # smoke each domain (~15–25 cases)
npm run test:dulith-qa          # full S+T+U+V+W program
npm run test:search-edge        # Group S only (200 combo cases)
```

Master summary: `test-results/dulith-qa/summary.json`. See `docs/DULITH-QA-PROGRAM.md`.

Results are written to `test-results/persona-results.json`.

`PASS / FAIL / ERR` is intentional: `ERR` means a rate-limit, connection, or fallback response where the model never really ran. Infra `ERR` cases should be re-run before filing a product bug.

---

## Browser E2E

Playwright uses `localhost:3107` with `reuseExistingServer: false` so it always starts a clean Kira server for browser checks.

```bash
npx playwright test
```

The E2E suite covers:

- smoke UI and language controls
- deterministic jailbreak/trust/tracking fast paths
- product search, quick-view, product cards, quick replies, and out-of-scope redirects
- tray quantity updates and checkout handoff with no local card form
- required delivery fields and editable delivery date
- Sinhala/Tamil mode checks
- invalid tracking and new-chat reset

The checkout E2E mocks only `/api/checkout`, returning a Kapruka-style checkout URL so the browser can verify the handoff without creating a real order.

---

## Full Judge Verification

Run these before submission:

```bash
npm run lint
npm run build
node scripts/test-mcp.mjs
node scripts/run-tests.mjs
node scripts/test-personas.mjs --concurrency 1
npx playwright test
```

Sinhala copy still needs a native-speaker review for final submission quality; automated script checks only confirm that Sinhala mode stays in Sinhala and avoids obvious fallbacks.

---

## Agent Loop (CEO-scored continuous QA)

Runs for ~90 minutes (configurable): judge dry-run each round, core suite every 3rd round, rotating persona batches + random edge scenarios, CEO lens scoring, and safe auto-fix notes.

```bash
npx next dev --port 3107
export KIRA_API_URL=http://localhost:3107/api/chat
npm run test:agent-loop              # 90 min default
npm run test:agent-loop:quick          # 15 min smoke
node scripts/agent-loop.mjs --duration 90 --batch 25 --edge 10 --target-pass 93 --target-ceo 8
```

Results: `test-results/agent-loop/iteration-NNN.json` and `summary.json`.
Stops early if two consecutive rounds hit pass-rate and CEO score targets with judge 10/10.
