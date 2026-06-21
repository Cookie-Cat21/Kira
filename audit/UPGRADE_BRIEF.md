# Kira Upgrade Brief

**Date:** 2026-06-21  
**Goal:** Ship-grade AI-native Kapruka concierge for Agent Challenge demo

---

## A. Current Kapruka weaknesses

### What makes kapruka.com feel legacy
- Dense purple header with 6+ competing icons on mobile
- Category icon walls (12–20+ circular icons) instead of intent-first discovery
- Truncated labels on mobile ("Combo Gift …", "Grocery & H…")
- SEO paragraphs before interactive content on catalog pages
- Delivery confidence hidden until late in funnel
- Order tracking buried in marketing chrome
- No conversational entry point

### Biggest UX debt by page
| Page | Debt |
|------|------|
| Homepage | Category overload above fold; no gift finder |
| Catalog | 125k products with no guided intent routing |
| Order status | Simple task hidden in full site shell |
| Global | Catalog-first thinking; repeated CTAs |

### Patterns Kira must avoid
See `/audit/kapruka-current/NOTES.md` Section D.

---

## B. Kira opportunity map

| Surface | Opportunity |
|---------|---------------|
| **Home / hero** | Intent-first landing: "Tell me who, where, when, budget" — not category wall |
| **Chat composer** | Single input + language toggle; starter chips for common intents |
| **Quick suggestions** | Occasion chips (birthday, track order, same-day Colombo) |
| **Gift brief chips** | CommerceRail shows extracted recipient/occasion/city/date/budget |
| **Product cards** | Curated carousel (max 6) with delivery badge and "why it fits" copy |
| **Product quick view** | Full-screen modal without leaving conversation |
| **Store rails** | Secondary surface; Kira is primary. Dock on store pages. |
| **Cart drawer** | Persistent gift tray with fly-to-cart animation |
| **Delivery estimator** | Upfront city + date chips; live MCP delivery quote in chat |
| **Checkout handoff** | Conversational field collection → real pay link |
| **Order tracking** | Natural language "track order KP12345" → timeline |
| **Loading / error** | Visible MCP tool steps; retry/alternatives on failure |
| **Sinhala / Tanglish** | EN/SI/TA toggle; Noto Sans Sinhala; no layout break |
| **Mobile dock** | Full-width Kira slide-over on store pages; full-screen at `/` |

---

## C. Best references by surface

### Home / hero
1. **Apple.com** — oversized headline, single CTA (inspiration, free)
2. **Lapa Ninja dark landings** — gradient + glass (inspiration, free)
3. **Kapruka MCP portal** — live catalog proof (code-available, free)

### Chat composer
1. **GOAT Assist** — dark input, minimal chrome (inspiration)
2. **shadcn Input** — accessible base (code-available, free)
3. **Perplexity** — thinking steps visible (inspiration)

### Product cards
1. **SSENSE grid** — image-first, minimal metadata (inspiration)
2. **shadcn blocks** — card structure (code-available, free)
3. **Amazon delivery badges** — confidence signal (inspiration)

### Cart / checkout
1. **Stripe payment links** — clear handoff (inspiration)
2. **Vaul drawer** — mobile sheet (code-available, free)
3. **Apple Wallet** — order summary strip (inspiration)

---

## D. Free implementation matches

| Pattern | Source | Component | Files affected |
|---------|--------|-----------|----------------|
| Full-screen Kira at `/` | Existing architecture | `KiraExperience` | `app/page.tsx` |
| Gift brief chips | Custom | `CommerceRail` | `KiraExperience.tsx`, `lib/commerce-context.ts` |
| Cart persistence | localStorage | `CartContext` | `app/context/CartContext.tsx` |
| Dark glass hero | `globals.css` | CSS tokens | `app/globals.css` |
| MCP tool steps | Existing | `ThinkingBlock` | `app/api/chat/route.ts` |
| Order tracking | MCP `kapruka_track_order` | `OrderTracker` | `route.ts` fast-path |

---

## E. Upgrade priority (scored)

**Formula:** Priority = Impact + Wow + MCP alignment − Effort − Risk

| # | Improvement | Impact | Effort | Wow | MCP | Risk | Score |
|---|-------------|--------|--------|-----|-----|------|-------|
| 1 | Restore full-screen Kira at `/` | 5 | 1 | 5 | 5 | 1 | **13** |
| 2 | Wire CommerceRail gift brief chips | 4 | 2 | 4 | 4 | 1 | **9** |
| 3 | Cart localStorage persistence | 3 | 1 | 2 | 3 | 1 | **6** |
| 4 | Delivery badge on product cards | 4 | 2 | 3 | 5 | 1 | **9** |
| 5 | Demo prompt fast-path optimization | 5 | 2 | 4 | 5 | 2 | **10** |
| 6 | GROQ_API_KEY missing banner | 3 | 1 | 1 | 4 | 1 | **6** |
| 7 | Mobile cart button in Kira header | 3 | 2 | 2 | 2 | 1 | **4** |
| 8 | Embla carousel polish | 2 | 3 | 3 | 1 | 2 | **1** |
| 9 | Vaul bottom sheet migration | 2 | 4 | 3 | 1 | 3 | **-1** |
| 10 | Global error.tsx | 2 | 2 | 1 | 2 | 1 | **2** |

---

## F. Final recommended build list (top 8)

1. **Restore full-screen Kira at `/`** — P0, done
2. **Wire CommerceRail** — demo context chips, done
3. **Cart persistence** — done
4. **Optimize birthday-gift demo fast-path** — ensure MCP search + delivery in one turn
5. **Delivery confidence on product cards** — show city/date badge when delivery SSE arrives
6. **GROQ missing key banner** — prevent silent empty responses in demo
7. **Cart access from Kira header** — bag icon for demo step 9
8. **Polish 375px mobile spacing** — CommerceRail scroll, input safe-area
9. **Verify all demo flows** — track, cheaper options, add to cart, checkout, Sinhala
10. **Apple Design Head review** — iterate to 93+ SHIP

**Explicitly NOT in scope:**
- Vaul migration (risk > reward this session)
- Embla carousel (CSS scroll works)
- New features (coupons, wishlist, brand filter)
- Storefront rewrite
