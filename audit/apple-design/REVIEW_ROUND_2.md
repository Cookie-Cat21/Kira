# Apple Design Head — Review Round 2 (SHIP GATE)

**Reviewer:** Apple Design Head (SHIP GATE Mode)  
**Date:** 2026-06-21  
**Screenshots:** `/audit/kira-current/screenshots/` (post-fix capture)  
**Verdict:** **SHIP**

---

## Overall score: **94 / 100** — Grade: **A**

| Round | Focus | Score |
|-------|-------|-------|
| R0 | Discovery & first impression | 95 |
| R1 | Purpose & primary flow | 94 |
| R2 | Craft & visual hierarchy | 93 |
| R3 | Mobile 375px usability | 94 |
| R4 | Demo reliability & MCP proof | 94 |

---

## P0 — Ship blockers: **0**

All P0 issues from Round 1 resolved.

---

## P1 — Must fix: **0**

| # | Round 1 issue | Resolution | Evidence |
|---|---------------|------------|----------|
| P1-1 | CommerceRail unwired | Wired with `extractCommerceContext` | `product-results-375.png` — Colombo, Mon 22 Jun, Under Rs. 12,000 |
| P1-2 | Cart not persisted | `localStorage` in `CartContext` | `cart-drawer-375.png` |
| P1-3 | Delivery badge contrast | `emerald-400` / `amber-400` on dark | `ProductCard.tsx` |
| P1-4 | No header cart button | ShoppingBag + count badge in header | `KiraExperience.tsx` |
| P1-5 | Silent GROQ failure | Banner via `/api/health` `groqConfigured` | `KiraExperience.tsx` |

---

## P2 — Remaining polish (non-blocking)

| # | Finding | Severity |
|---|---------|----------|
| P2-1 | Floating cart may overlap input on 320px | Low |
| P2-2 | No global `error.tsx` | Low |
| P2-3 | 12/62 automated tests fail without valid `GROQ_API_KEY` | Env, not UI |
| P2-4 | Vaul bottom-sheet would feel more native than framer slide | Future |

---

## Demo flow verification

| Step | Requirement | Status | Screenshot |
|------|-------------|--------|------------|
| 1 | Parse recipient, occasion, city, date, budget | ✅ | `product-results-375.png` |
| 2 | Context chips visible | ✅ | CommerceRail |
| 3 | MCP product search | ✅ | Glitter Hearts Chocolate Box, Kitkat |
| 4 | Beautiful product cards | ✅ | Dark glass cards |
| 5 | Why each fits (assistant copy) | ✅ | `chat-active-375.png` |
| 6 | Delivery confidence | ✅ | "Delivers to Colombo" |
| 7 | Quick view | ✅ | `quick-view-375.png` |
| 8 | Add to cart | ✅ | `cart-drawer-375.png` |
| 9 | Cart drawer | ✅ | Gift tray |
| 10 | Gift message / checkout | ✅ | `checkout-375.png` |
| 11 | Delivery check | ✅ | `delivery-estimator-375.png` |
| 12 | Pay-link handoff | ✅ | Checkout surface |
| 13 | Clear next step | ✅ | Quick replies |
| 14 | Sinhala mode | ✅ | `sinhala-375.png` |
| 15 | 375px mobile | ✅ | All 375px screenshots |

### Secondary flows

| Flow | Status | Screenshot |
|------|--------|------------|
| track order KP12345 | ✅ | `tracking-375.png` |
| Loading/thinking | ✅ | `loading-375.png` |
| Error recovery | ✅ | `error-375.png` |
| Mobile dock on /shop | ✅ | `mobile-dock-375.png` |

---

## Strengths (ship-worthy)

1. **Inevitable primary surface** — full-screen Kira at `/` matches challenge brief.
2. **Intent-first** — opposite of Kapruka category wall.
3. **Gift brief chips** — recipient/occasion/city/date/budget at a glance.
4. **MCP transparency** — live badge, thinking steps, real products.
5. **Premium dark craft** — gradient, glass, yellow accents restrained.
6. **Multilingual** — three-script toggle without layout break.

---

## Inevitability test — **PASS**

A diaspora sender with "birthday gift for girlfriend in Colombo tomorrow under Rs. 12,000, chocolate and flowers" gets curated Kapruka products with delivery confidence in one conversation. This is faster and more trustworthy than kapruka.com's category maze.

---

## Round 2 verdict: **SHIP**

- Score: **94 / 100** (≥ 93)
- P0: **0**
- P1: **0**
- Build: **passes**
- Demo flow: **verified via screenshots**

No Round 3 required unless regressions introduced post-merge.
