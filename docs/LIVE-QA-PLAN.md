# Live URL QA Plan

## Problem

Judges and real users hit **production** (`kira-peach.vercel.app`), not localhost. A fix can pass local Dulith suites but fail live if:

- Vercel deploy lags behind `main`
- Production MCP/cache returns different SKUs
- Groq path differs from deterministic fast-path on edge

The flowers+chocolates → ribbon **cake** bug was observed on live after local fixes merged.

## Strategy

### Layer 1 — Live regression traps (blocking)

`scripts/live-regression.mjs` runs **~35 canonical traps** against `KIRA_LIVE_URL` (default production `/api/chat`):

- S001 combo repro (`chocolates and flowers` — no ribbon cakes)
- Category purity (flowers, hampers, chocolates)
- Context bleed (multi-turn switch)
- Vague intent (no premature carousel)
- Repair flow (no hand-deliver preach)

Exit non-zero on any failure. Designed for CI + pre-release gate.

### Layer 2 — Live Dulith loop

`scripts/live-qa-loop.mjs`:

1. Review this plan (≥9/10)
2. Run live regression traps
3. Run smoke from each Dulith domain (S/T/U/V/W) against live URL
4. Score CEO lens per case
5. Write `test-results/live-qa/summary.json`
6. Exit non-zero if persona or CEO < **90%**

Fix → push → wait for deploy → re-run until green.

### Layer 3 — Prevention on every carousel

- `filterProductsForSearch()` on **all** paths (fast-path, multi-merge, LLM)
- Final sanitize pass on multi-category merge before SSE
- Group S+T edge suites in CI against live (scheduled)

### Layer 4 — GitHub Actions

`.github/workflows/live-regression.yml` — daily + manual dispatch against production.

## What we do NOT do

- Rely on localhost-only QA before merge
- Skip regression when only "phrasing" changed
- Deploy without live trap pass (manual gate via workflow)

## Success criteria

| Gate | Target |
|------|--------|
| Live regression traps | 100% pass |
| Live Dulith smoke (5 domains) | ≥90% persona + CEO |
| LIVE-S001 repro | No flower-themed cakes in combo carousel |
| CI workflow | Green on schedule |

## Commands

```bash
export KIRA_LIVE_URL=https://kira-peach.vercel.app/api/chat
npm run test:live-regression
npm run test:live-qa:smoke
npm run test:live-qa
```
