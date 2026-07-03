# Breakup Repair Plan — Hand-deliver + Real Bouquets (Group Y)

## Problem

Challenge-email gold path: user broke up and needs flowers. Kira must:

1. Respond with **Aiyo + personality** — Kapruka ships bouquets **to the user**, they **hand-deliver to her** (lands better than courier)
2. Show **real rose/bouquet carousels** — not banana flower, hair clips, Flower Center junk
3. Offer **note card** on breakup flower flows
4. When user says **"don't hand deliver"** — Kapruka delivers straight to her door; never mention hand-deliver

Prior failures: generic "deliver to her door" on breakup, grocery flower junk in carousel, preachy DIY advice on angry-partner (non-breakup) flows.

## Strategy

### Layer 1 — Deterministic repair fast-path (`search-fast-paths.ts`)

- `repairIntroKeys()` picks intro by breakup / anti-hand-deliver
- Breakup + flowers → `repairBreakupHandDeliverIntro` + rose/bouquet search queries
- Anti-hand-deliver → `repairDirectToHerIntro` only
- Non-breakup repair → `repairGiftSearchIntro` (Kapruka to her)

### Layer 2 — Product filter (`search.ts`)

- `FLOWER_BOUQUET_NAME_RE` + expanded `FLOWER_JUNK_RE` (banana flower, hair clips, pvt ltd)

### Layer 3 — Dulith QA (Group Y — 500 personas)

~167 cases × **en / si / ta**:

| Scenario | Checks |
|----------|--------|
| Breakup + flowers/roses | `breakupHandDeliverTone`, `noFlowerJunk`, `productsOrHonestEmpty` |
| Breakup + flowers + city | same + delivery tone |
| Anti-hand-deliver (3 langs) | `products`, `noText` hand-deliver, `noFlowerJunk` |
| Angry partner deliver to her | `noBreakupHandDeliverTone`, `noHandDeliver`, products |
| Breakup ask (no product yet) | `breakupAiyoTone`, `asksClarifyingOrProducts` |

Lens: `isPreachyHandDeliver()`, `hasBreakupHandDeliverTone()`, CEO **≥90%**.

### Layer 4 — Live traps

- `LIVE-Y001` — EN breakup hand-deliver + real bouquets
- `LIVE-Y002` — SI breakup flowers
- `LIVE-Y003` — TA anti-hand-deliver

## What we do NOT do

- Hand-deliver lecture when user explicitly forbids it
- Show grocery/decor junk on flower searches
- Cold "deliver to her door" copy on breakup + flowers (must be ship-to-you hand-deliver story)

## Success criteria

| Gate | Target |
|------|--------|
| Group Y persona pass | ≥90% |
| Group Y `noFlowerJunk` | 100% on product carousels |
| Group Y breakup hand-deliver tone | ≥90% on breakup+flower subset |
| Live Y traps | 3/3 pass |
