# Apple Design Head — Review Round 1

**Reviewer:** Apple Design Head (Full Mode)  
**Date:** 2026-06-21  
**Screenshots:** `/audit/kira-current/screenshots/`  
**Verdict:** **ITERATE**

---

## Overall score: **87 / 100** — Grade: **B+**

| Round | Focus | Score |
|-------|-------|-------|
| R0 | Discovery & first impression | 90 |
| R1 | Purpose & primary flow | 88 |
| R2 | Craft & visual hierarchy | 85 |
| R3 | Mobile 375px usability | 86 |
| R4 | Demo reliability & MCP proof | 88 |

---

## P0 — Ship blockers

| # | Finding | Screen | File | Screenshot |
|---|---------|--------|------|------------|
| P0-1 | **Homepage rendered storefront, not Kira** — challenge requires immersive chat at `/`. Users landing on `/` could not access Kira. | `/` | `app/page.tsx` | `hero-375.png` (pre-fix) |

**Status:** Fixed — `app/page.tsx` now renders `KiraExperience`.

---

## P1 — Must fix before demo

| # | Finding | Screen | File | Screenshot |
|---|---------|--------|------|------------|
| P1-1 | **CommerceRail built but unwired** — demo requires context chips for recipient/occasion/city/date/budget. | Active chat | `KiraExperience.tsx` | `product-results-375.png` |
| P1-2 | **Cart lost on refresh** — breaks "shared bag" promise across session. | Cart | `CartContext.tsx` | — |
| P1-3 | **Delivery badge contrast** — `text-emerald-600` on dark card reads muddy at 375px. | Product cards | `ProductCard.tsx` | `product-results-375.png` |
| P1-4 | **No cart access in Kira header** — demo step 9 requires cart drawer; only floating button appeared after add. | Header | `KiraExperience.tsx` | `hero-375.png` |
| P1-5 | **Silent GROQ failure** — missing API key returns empty responses with no user feedback. | Global | `route.ts` / health | — |

---

## P2 — Polish (fix if time)

| # | Finding | Screen | File |
|---|---------|--------|------|
| P2-1 | Hero fallback shows emoji placeholder before client hydration | Hero | `KiraExperience.tsx` |
| P2-2 | Floating cart button may overlap chat input safe-area on small screens | Mobile | `FloatingCartButton.tsx` |
| P2-3 | "Browse store" competes with primary chat CTA on hero | Hero header | `KiraExperience.tsx` |
| P2-4 | No global `error.tsx` — MCP failures only surface in-component | Global | `app/` |

---

## Strengths

- **Intent-first hero** — "Tell me who, where, when, budget" beats Kapruka's category wall.
- **CommerceRail** (post-fix) — Colombo + date + budget chips visible in `product-results-375.png`.
- **Dark liquid-glass aesthetic** — premium contrast to legacy Kapruka purple marketplace.
- **MCP proof** — Live badge, thinking steps, real product carousel from Kapruka catalog.
- **Multilingual toggle** — EN / සිං / தமிழ் without layout break.
- **Delivery confidence on cards** — "Delivers to Colombo" with checkmark.
- **Quick replies** — "Ready to checkout", budget filters reduce typing.

---

## Inevitability test

**Question:** Does this feel like the fastest way to send a gift through Kapruka?

**Answer (post P0 fix):** Approaching yes. One message → context chips → curated products → add to tray → checkout. The architecture is right. Remaining gaps are craft (contrast, cart access) and reliability (env warning), not concept.

**Would this surprise leadership in a Monday review?** The product-results screenshot would not — it looks intentional. The pre-fix homepage would have been an instant reject.

---

## Exact fixes required

1. ✅ Restore `KiraExperience` at `/`
2. ✅ Wire `CommerceRail` + `lib/commerce-context.ts`
3. ✅ Cart `localStorage` persistence
4. ✅ Header cart button when `cartCount > 0`
5. ✅ GROQ configured banner via `/api/health`
6. ✅ Delivery badge contrast (`emerald-400` / `amber-400`)
7. Re-run SHIP GATE after build + demo flow verification

---

## Round 1 verdict: **ITERATE**

Score 87 < 93 threshold. P0 fixed. P1 fixes applied. Proceed to Round 2 SHIP GATE.
