# Kira Storefront Design Audit

Visual reference audit of **empi.re** and **kaleidojewellery.com** — the two sites we're stealing patterns from for the `/shop` storefront redesign.

## What's in here

| File / folder | Purpose |
|---|---|
| [`AUDIT.md`](./AUDIT.md) | Master audit — typography, colors, spacing, component inventory |
| [`PATTERNS.md`](./PATTERNS.md) | Cross-site pattern library (marquees, cards, headings, CTAs) |
| [`KIRA-GAPS.md`](./KIRA-GAPS.md) | Current Kira `/shop` vs reference sites — what to build |
| [`CURSOR-PROMPT.md`](./CURSOR-PROMPT.md) | Implementation prompt for Cursor — 10 components in priority order |
| [`empire/INDEX.md`](./empire/INDEX.md) | Page-by-page Empire breakdown + screenshot map |
| [`kaleido/INDEX.md`](./kaleido/INDEX.md) | Page-by-page Kaleido breakdown + screenshot map |
| [`screenshots/`](./screenshots/) | Captured viewport screenshots (1440×900 @2x) + computed CSS JSON |

## Re-capturing screenshots

```bash
npx playwright install chromium   # first time only
node scripts/capture-design-audit.mjs
```

The script writes to `screenshots/{empire,kaleido}/{page-slug}/`:
- `viewport-top.png` — above-the-fold
- `scroll-0.png` — first scroll position
- `computed-styles.json` — measured fonts/colors from live DOM

## How to use this audit

1. **Read `KIRA-GAPS.md`** — see what's broken/missing in current `/shop`
2. **Open the screenshot** for the component you're building (paths in `empire/INDEX.md` or `kaleido/INDEX.md`)
3. **Copy exact values** from `AUDIT.md` / `PATTERNS.md` (padding, radius, font sizes)
4. **Follow `CURSOR-PROMPT.md`** — build components one at a time, test each before moving on

## Pages captured (Jun 2026)

### Empire (empi.re)
- Home, Shop All, Shop Clothing, PDP (snapback), In The News, store.empi.re

### Kaleido (kaleidojewellery.com)
- Home, Bestsellers, Earrings, PDP (mini huggie), Sale
