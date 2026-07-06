# Dulith Autonomous Execution Plan

> **Applicant:** F8QYZ · Ovindu Karunaratne  
> **Deadline:** 5 July 2026  
> **Production demo:** https://kira-peach.vercel.app  
> **Human approval:** **NOT REQUIRED** — plans auto-approve at ≥9/10; implementation loops until gates pass.

This document is the single source of truth for autonomous agent work on the Kapruka Agent Challenge. Any Cloud Agent or local dev session should follow this loop without waiting for Ovindu.

---

## Challenge email → what we built

| Kapruka ask | Kira response | Gate |
|-------------|---------------|------|
| "Not a search box in chat costume" | Repair-flow friend tone, vague-intent clarifiers, opinionated few-shots | Group W + CEO lens |
| Everyday shopper, not just gifts | Electronics / Grocery / Home chips + breadth fast-paths | Core tests 58–62 |
| Multi-item cart | Cart tray + checkout summary | Core suite + Path A dry-run |
| Delivery-date handling | `kapruka_check_delivery` + date in checkout | LIVE-S003, checkout flow |
| Gift messaging | Checkout message field + prompt rules | Checkout modal e2e |
| Sinhala / Tanglish bonus | Unicode-gated Sinhala mode + Tanglish repair tone | Group G + language smoke |
| Reorder habit (CEO #1) | One-tap "Order this again" + Welcome back strip | Group X, LIVE-X001/X002 |
| Hosted public demo | Vercel production | Live regression 12/12 |

---

## Autonomous loop (no human gate)

```
┌─────────────────────────────────────────────────────────────┐
│  1. PLAN — dulith-plan-review.mjs (≥9/10 auto-approves)   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT — fix highest-impact failure cluster only     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. TEST LOCAL — dev :3107 + run-tests + judge-dry-run      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. DEPLOY — push main → Vercel auto-deploy                 │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. TEST PRODUCTION — dulith-gate + live-regression         │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    pass? ──no──► back to 2
                           │
                          yes
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  6. SUBMIT — reply mcp_support@kapruka.com with live URL    │
└─────────────────────────────────────────────────────────────┘
```

### One command (production gate)

```bash
npm run test:dulith-gate
```

Runs: all 6 plan reviews → 12 live traps → 105 domain smoke personas (S–X).  
Exit 0 = **APPROVED — ship the demo**.

### Full local + production cycle

```bash
npm run test:dulith-autonomous        # production gate only (~8 min)
npm run test:dulith-autonomous:full   # + local core suite + judge dry-run + e2e
```

### Continuous QA (when iterating locally)

```bash
npx next dev --port 3107
export KIRA_API_URL=http://localhost:3107/api/chat
npm run test:agent-loop               # 90 min CEO-scored loop with auto-fix hints
```

---

## Six Dulith domains (all plans 10/10 as of 3 Jul 2026)

| ID | Group | Plan doc | Failure class |
|----|-------|----------|---------------|
| search-routing | S | `SEARCH-ROUTING-PLAN.md` | Combo search → flower-themed cakes |
| category-purity | T | `CATEGORY-PURITY-PLAN.md` | Single category → junk SKUs |
| context-bleed | U | `CONTEXT-BLEED-PLAN.md` | Follow-up uses prior turn category |
| vague-intent | V | `VAGUE-INTENT-PLAN.md` | Zero context → premature carousel |
| repair-flow | W | `REPAIR-FLOW-PLAN.md` | Preachy hand-deliver over Kapruka |
| one-tap-reorder | X | `REORDER-PLAN.md` | Reorder hidden in chat only |

**Pass criteria per domain:** ≥90% persona + ≥90% CEO lens (heuristic Dulith scoring).

---

## Current baseline (3 Jul 2026)

| Gate | Result |
|------|--------|
| All 6 plans | 10/10 — auto-approved |
| Live regression (12 traps) | 12/12 (100%) |
| Domain smoke (105 cases) | 100% persona + 100% CEO |
| **Dulith final gate** | **10/10 APPROVED** |

Artifacts: `test-results/dulith-final-gate.json`, `test-results/dulith-qa/summary.json`

---

## Judge demo script (record before submit)

Follow `docs/JUDGE-DRY-RUN.md`:

- **Path A (~60s):** One-tap reorder — CEO priority, lead with this
- **Path B (~30s):** Combo search + context bleed
- **Path C (~20s):** Repair tone — Kapruka delivery, no DIY preach
- **Path D (~15s):** Chat "order again" fallback

15-second pitch (from dry-run doc):

> "Kira is Kapruka's AI shopping companion — live catalog, delivery quotes, guest checkout. Repeat buyers reorder in two taps without retyping Amma's address. Everything you see is wired to Kapruka MCP, not invented products."

---

## What the agent may do without asking Ovindu

- Run any Dulith / persona / live-regression / e2e test suite
- Fix failing gates (prioritize by severity × domain weight)
- Push to `main` when all production gates pass
- Update plan docs when a new failure class is discovered
- Re-run gates after every deploy

## What still needs Ovindu (human-only)

| Task | Why |
|------|-----|
| Screen record Path A | Judges want a visual walkthrough |
| Reply to `mcp_support@kapruka.com` | Submission channel |
| Confirm `.env.local` Groq keys on Vercel | Production chat needs `GROQ_API_KEY` |
| Optional: custom domain | Bragging rights only |

---

## If a gate fails

1. Read `test-results/dulith-qa/summary.json` → `failures[]` per domain
2. Identify failure **class** (not individual phrasing) — see domain plan docs
3. Fix at architectural layer (fast-path, filter, prompt section)
4. **Do not** add one-off regex per persona variant
5. Re-run failed domain only:  
   `node scripts/dulith-qa-orchestrator.mjs --smoke --domain <id>`
6. When green locally, push → wait ~2 min for Vercel → `npm run test:dulith-gate`

---

## Phase 2 (explicitly deferred — do not block v1)

- Kapruka account login / order history API
- Cross-device sync (Supabase)
- Voice input (orb is visual only)
- Scheduled occasion reminders
- Custom cake MCP tool

See `docs/REORDER-PLAN.md` § Phase 2.

---

## Daily autonomous checklist (until 5 Jul)

- [ ] `npm run test:dulith-gate` — must stay green
- [ ] GitHub Actions live-regression workflow — check daily cron
- [ ] Groq quota — if traps flake with "slammed" message, wait 60s and retry once
- [ ] Record Path A video when gates stable for 24h
- [ ] Email submission link
