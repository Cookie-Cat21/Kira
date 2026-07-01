# Category Purity Plan

## Problem

Kapruka keyword search returns **category-adjacent junk** that passes naive filters:

| User asks | Junk that slips through |
|-----------|-------------------------|
| flowers / bouquets | greeting cards, pen sets, key tags, crochet |
| chocolates | scented candles, lip balm, mugs |
| cakes | toppers, number candles, greeting cards |
| hampers | single soap bars, coconut water, stationery |

Showing these in Kira carousels destroys trust — feels like a broken search box, not a gift concierge.

Adding one regex per junk SKU is whack-a-mole.

## Strategy

### Layer 1 — Category relevance filters (primary)

`filterProductsForSearch()` + `CATEGORY_IRRELEVANCE_TERMS` in `lib/kira/search.ts`:

- **flowers** → reject FLOWER_JUNK (cards, pens, artificial decor)
- **chocolate** → reject CHOCOLATE_JUNK (candles, cosmetics)
- **cake** → reject CAKE_JUNK (toppers, candles alone)
- **hampers** → require HAMPER_NAME_RE in title; reject HAMPER_JUNK

Run on **every** carousel path (fast-path, multi-search, LLM agent).

### Layer 2 — Single-lane searches only

Group T tests **one category per message** — no combo routing. Ensures purity filters work in isolation.

### Layer 3 — Automated QA (Group T)

~120 generated personas:

- `show me flowers on Kapruka` + 30 phrasing/city/budget variants
- Same for chocolates, cakes, hampers, roses
- Budget chips: `mixed flower bouquets under 3000`
- Brand paths: `Hilton birthday cake`

Checks per case:

- `searchRelevance` — category match
- `noFlowerJunk` / `noCategoryJunk` — named junk patterns
- `noFamilyUnsafe`
- CEO lens gate **≥90%**

### Layer 4 — Orchestrator loop

Part of `dulith-qa-orchestrator.mjs` — re-run Group T until gates pass.

## What we do NOT do

- Maintain a blocklist of 500 SKU names
- Skip filters on LLM-initiated searches
- Accept "close enough" products in carousels

## Success criteria

| Gate | Target |
|------|--------|
| Group T persona pass | ≥90% |
| Group T CEO lens | ≥90% |
| Group T search relevance | ≥90% |
| Live | `show me flowers on Kapruka` → no greeting cards or pen sets |
