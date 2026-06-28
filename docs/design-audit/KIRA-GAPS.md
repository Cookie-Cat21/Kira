# Kira /shop Gap Analysis

What the current storefront has vs what the reference sites do. Use this to prioritize the redesign.

Screenshots of current state: run `npm run dev` and visit `http://localhost:3000/shop`.

---

## Current state summary

| Area | Current implementation | Problem |
|---|---|---|
| **Hero** | `StoreHero.tsx` — gradient blobs + placeholder `HeroTile` colored boxes | No real product photography. Tiles are empty colored rectangles, not lifestyle images. |
| **Categories** | `CategoryRail.tsx` — 150px glass cards with icons | Horizontal scroll of tiny cards. Reference sites use **full photo grid** (Kaleido) or **large editorial tiles**. |
| **Section headings** | `ProductRail.tsx` — `text-2xl` DM Serif | Way too small. Empire uses 47–72px Druk. Kaleido uses 48px Outfit. No "View All" pill CTA. |
| **Product cards** | `StoreProductCard.tsx` — glass card, tiny `+` button | No category badge. Price separated from CTA. Reference sites use **black pill badge** + **price-in-CTA**. |
| **Nav** | `StoreNav.tsx` — sticky glass nav | Good foundation. Missing announcement bar above it. |
| **Filters** | None on `/shop` or `/shop/[slug]` | Empire clothing page has full filter pill row + sidebar. Kaleido has filter bar. |
| **Marquee/ticker** | None | Both reference sites have top announcement + scrolling ticker strip. |
| **Side tab** | `KiraDock` launcher in nav only | Kaleido has fixed **OFFERS** vertical tab on right edge — much more discoverable. |
| **Editorial panels** | `KiraBand.tsx` — single band | Kaleido has **2 full-bleed editorial panels** with photo + CTA. |
| **Occasion nav** | None | Kaleido Bestsellers has **100px circular sub-category navigator**. |

---

## Component-by-component gaps

### ❌ Missing entirely

| Component | Reference | Priority |
|---|---|---|
| Announcement marquee bar | Kaleido lavender bar | P0 |
| Marquee ticker strip | Empire `\| 100% INDEPENDENT \|` | P0 |
| Category filter pill row | Empire `/shop/clothing` | P1 |
| Circular occasion navigator | Kaleido Bestsellers circles | P1 |
| Black pill badge on cards | Empire product cards | P0 |
| Price-in-CTA button | Kaleido + Empire PDP | P0 |
| Lifestyle photo category grid | Kaleido home 6-col grid | P0 |
| Editorial 2-col feature panels | Kaleido home promos | P1 |
| Ask Kira fixed side tab | Kaleido OFFERS tab | P1 |

### ⚠️ Exists but needs upgrade

| Component | File | What to change |
|---|---|---|
| Section headings | `ProductRail.tsx`, `shop/page.tsx` | `text-2xl` → `text-4xl font-black uppercase` + add pill "View All →" |
| Hero tiles | `StoreHero.tsx` | Replace `HeroTile` placeholders with real Unsplash/Kapruka images |
| Category rail | `CategoryRail.tsx` | Replace icon cards with lifestyle photo grid OR add `OccasionCircles` above |
| Product card CTA | `StoreProductCard.tsx` | Replace `+` icon with full-width "Add to Cart — LKR X" button |
| Product card badge | `StoreProductCard.tsx` | Add black pill `absolute top-3 left-3` category chip |

### ✅ Already good (keep)

| Component | File | Notes |
|---|---|---|
| Sticky glass nav | `StoreNav.tsx` | Solid — just add announcement bar above |
| Cart integration | `StoreProductCard.tsx` | Qty stepper works — keep alongside new CTA |
| Kira dock | `KiraDock.tsx` | Works — side tab just needs to call `open()` |
| Dark liquid-glass theme | `globals.css` | Different from reference sites (they're light) but intentional for Kira brand |
| GSAP hero animation | `StoreHero.tsx` | Keep animations, swap placeholder visuals |

---

## Dark theme adaptation notes

Both reference sites are **light mode** (white bg, black text). Kira `/shop` is **dark liquid-glass**. When stealing patterns:

| Reference (light) | Kira (dark) equivalent |
|---|---|
| Empire `#f5f5f5` card bg | `store-card` glass / `rgba(255,255,255,0.06)` |
| Kaleido `#F9F8F4` warm card | Same glass treatment |
| Kaleido `#EEEEEE` circles | `rgba(255,255,255,0.08)` glass circles |
| Black pill badge | **Keep black** — works on both light and dark |
| White rect tags (Kaleido) | `bg-white/90 text-kira-canvas` |
| Kaleido lavender `#E8A5EA` | `kap-purple` or `kap-yellow` for announcement bar |
| Empire black ticker | `var(--kira-canvas)` or pure `#000` |

The **shapes, spacing, and typography scale** transfer directly. Only swap light-bg colors for glass/dark equivalents.

---

## Implementation order (matches CURSOR-PROMPT.md)

1. Announcement bar → quick win, top of page
2. Marquee ticker → visual separator
3. Section headings → affects every rail immediately
4. Filter pills → category pages
5. Black pill badge → product cards
6. Price-in-CTA → product cards
7. Circular occasion nav → homepage
8. Lifestyle category grid → replaces placeholder rail
9. Editorial panels → homepage bottom
10. Ask Kira side tab → all store pages

Build and test each before moving to the next.
