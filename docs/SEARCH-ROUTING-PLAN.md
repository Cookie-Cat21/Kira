# Search Routing Master Plan

## Problem

Regex fast-paths run **before** the LLM for many `"show me …"` queries. A single keyword search + category filter cannot handle:

- Multi-category combos (`"flowers and chocolates"`)
- Cross-category conjunctions (`"cake with roses"`)
- Kapruka keyword noise (flower-**themed cakes** passing flower filters)

Adding one regex per phrasing is whack-a-mole — every new combo breaks again.

## Strategy: Hybrid routing (not more regex)

### Layer 1 — Route by intent complexity

| Route | When | Handler |
|-------|------|---------|
| **Deterministic** | Tracking, checkout, jailbreak, trust, reorder, re-show, popular/sale, single clear category, bare `product + budget`, storefront slug browse | Existing fast-paths |
| **Agent (LLM + MCP tools)** | 2+ categories detected, `and`/`with`/`plus` cross-category joins, `X or Y` across categories | Groq agent loop |

Implementation: `shouldBypassSearchFastPath()` in `lib/kira/search-routing.ts` — returns `false` from search fast-path so the LLM runs targeted searches.

### Layer 2 — Filter as safety net (not primary logic)

`filterProductsForSearch()` improvements:

1. **Single flower intent** → reject SKUs whose name/body is primarily cake/pastry (flower-themed ribbon cakes are not bouquets).
2. **Multi-category intent** → product must match **at least one** requested category (OR), with the same cake exclusion on flower lane.

Filters never replace routing — they catch MCP keyword noise after any path.

### Layer 3 — Automated relevance QA (Group S)

~200 generated personas covering:

- Combo phrasing (`and`, `with`, `plus`, `&`, commas)
- Single-category control cases (must still pass fast-path)
- Budget + city + combo mixes
- Sinhala/romanized/Tanglish variants
- Known failure class: flower-named cakes in flower+chocolate queries

Each case runs:

- `searchRelevance` — carousel category purity
- `noFlowerJunk`, `noCategoryJunk`, `noFamilyUnsafe`
- CEO lens (Dulith heuristic) — gate **≥90%** excitement mapping

### Layer 4 — Orchestrator loop

`scripts/search-edge-orchestrator.mjs`:

1. Run Group S (`--concurrency 1`)
2. Score persona pass + CEO lens + relevance
3. Triage failures by cluster (routing vs filter vs copy)
4. Fix highest-impact cluster
5. Re-run until **≥90%** on all three gates

Plans are **auto-approved** when Dulith plan review scores ≥9/10 (see `scripts/dulith-plan-review.mjs`).

## What we explicitly do NOT do

- Add per-phrase regex for every combo variant
- Drop fast-paths entirely (latency + Groq cost on simple searches)
- Trust keyword search alone for multi-intent queries

## Success criteria

| Gate | Target |
|------|--------|
| Group S persona checks | ≥90% pass |
| Group S CEO lens | ≥90% pass (excitement ≥9/10 mapping) |
| Group S search relevance | ≥90% pass |
| Live repro | `"show me chocolates and flowers"` → no flower-themed cakes |

## Files

| File | Role |
|------|------|
| `lib/kira/search-routing.ts` | Category detection + fast-path bypass |
| `lib/kira/search.ts` | Multi-category + cake exclusion filters |
| `lib/kira/search-fast-paths.ts` | Early bypass hook |
| `scripts/generate-search-edge.mjs` | Group S (~200 cases) |
| `scripts/search-relevance.mjs` | Test-time relevance validator |
| `scripts/search-edge-orchestrator.mjs` | Fix loop until gates pass |
| `scripts/dulith-plan-review.mjs` | Founder plan approval gate |
