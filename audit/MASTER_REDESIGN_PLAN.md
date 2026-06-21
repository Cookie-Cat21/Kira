# Kira × Kapruka — Master Redesign Plan

**Date:** 2026-06-21  
**Goal:** Apple-level full-site redesign with Kira integrated — not an AI-slop chat skin.  
**Current verdict:** **74/100 — ITERATE** (Apple Design Head audit)  
**Target:** **≥93/100 SHIP** before merge

---

## Executive summary

The challenge scores the **chatbot**. Over-delivery is a **real Kapruka website** with Kira woven in. Today we have the right **architecture** (chat at `/`, store at `/shop`, shared cart, MCP) and the wrong **craft** (purple glass chip walls, fake attach, 3 cart buttons, glass-on-content).

**Root cause of "slop":** Prior work wrote markdown *about* reference sites instead of installing a design system and grafting real blocks from your bookmark folder.

**Fix strategy:** Three layers, one north star.

| Layer | Source | Role |
|-------|--------|------|
| **Foundation** | shadcn/ui primitives | Accessible Dialog, Sheet, Command, Carousel, Form, Badge, Skeleton, Empty |
| **Commerce chrome** | shadcnblocks (free) + HyperUI layouts | Nav, product grid, cart, PDP, footer, FAQ — real HTML/Tailwind to adapt |
| **Signature motion** | Aceternity + Magic UI + React Bits (max 2/page) | Apple Cards Carousel, Animated Beam (thinking), Border Beam (input) |

**Do NOT install:** DaisyUI (token collision), Tremor (dashboard charts), full-page WebGL backgrounds, Cult Pro unless budget allows.

---

## Bookmark folder → research results

| Your bookmark | Actually used before? | Research verdict |
|---------------|----------------------|------------------|
| **Shadcnblocks** | No | **Primary commerce block source** — product-card1, product-list1, shopping-cart2 (free) |
| **HyperUI** | Doc mention only | **Layout graft source** — headers, carts, product cards, FAQs (copy HTML → React) |
| **21st.dev** | chat-input only | **Discovery hub** — Animated Beam, AI prompt boxes, Apple Cards Carousel |
| **React Bits** | No | **Micro-motion** — Spotlight Card, Blur Text, Dark Veil (chrome only) |
| **Cult UI** | No | **/shop hero only** — Hero Color Panels OR static gradient (pick one) |
| **Apple Cards Carousel** | No | **Aceternity via shadcn** — featured product rails |
| **Animated Beam** | No | **Magic UI** — ThinkingLive tool visualization (functional, not decorative) |
| **Footers / FAQ** | No | shadcn Accordion + shadcnblocks/shadcnstudio mega-footer |
| **DaisyUI** | No | **Skip global install** — cherry-pick drawer/chat bubble *structure* only |
| **Tremor** | No | **Skip** — charts, not storefront |
| **Watermelon UI** | No | Optional carousel/card if shadcn carousel insufficient |
| **Icons** | Lucide ✓ | Keep Lucide; add Tabler only for gaps (WhatsApp, delivery) |

---

## Apple Design Head — current state

**Verdict: ITERATE (74/100)**

### P0 blockers
1. **Chip landfill on `/`** — 12+ chips before user types (recreated Kapruka category wall as pills)
2. **Dual primary CTAs on `/shop`** — "Find gifts with Kira" vs "Open full-screen chat"

### Top P1 anti-patterns (must kill)
- Glass on content cards (`backdrop-blur` on product cards, gift composer, chat input)
- Purple radial blobs + gradient CTAs + Sparkles + "rebuilt for 2026" ping badge
- Forced dark on entire commerce surface (diaspora gift buyers expect light product photography)
- Three cart entry points (header + CommerceRail + floating button)
- Touch targets &lt;44px on chips, steppers, nav icons
- Fake file attach in chat input (not wired to API)

### What already works (keep)
- `/` full-screen Kira as challenge primary surface
- MCP thinking steps, delivery badges, pay-link checkout
- Shared cart across store + chat
- Intent-first flow concept (GiftFinder → Kira dock)
- Kapruka legacy audit driving flow map

---

## Design north star

**Mental model:** Apple Store commerce + iMessage-caliber chat — not "ChatGPT with a cart."

### Split theme (fixes inverted dark mode P1)

| Surface | Theme | Rationale |
|---------|-------|-----------|
| `/shop`, `/shop/[slug]`, `/product/[id]`, `/track` | **Light** — `#F5F5F7` canvas, white cards, Kapruka purple accent | Product imagery pops; diaspora trust |
| `/` (Kira chat) | **Dark** — solid `#000` / `#1C1C1E` (not purple fog) | Immersive concierge; challenge demo |
| Chrome (nav, dock, cart, modals) | Glass **only here** | Liquid Glass rule: nav layer floats above content |

### Typography
- **UI:** System stack / Jakarta (already loaded) — 17px body mobile
- **Display:** DM Serif — **one headline per page max**, not every section label
- Kill: `GIFT BRIEF`, `START FAST`, uppercase micro-label soup

### Color discipline
- **One accent per viewport:** Kapruka purple OR yellow, not both fighting
- **Text hierarchy:** 100% / 60% / 30% opacity — no random `white/50`
- **No gradient CTAs** — solid fills; yellow for primary commerce, purple for brand chrome

### Motion budget (react-best-practices: `bundle-dynamic-imports`)
**Max 2 motion effects per route:**

| Route | Effect 1 (functional) | Effect 2 (functional) | Chrome (P1, pick one) |
|-------|----------------------|----------------------|------------------------|
| `/` | Animated Beam in ThinkingLive | Border Beam on input while streaming | — |
| `/shop` | Blur Text on hero headline | Apple Cards Carousel for trending | Dark Veil at 15% OR Cult static gradient |
| `/product/[id]` | Spotlight Card hover | Blur Fade on rail items | — |
| `/track` | Tracing Beam timeline | — | — |

---

## Component sourcing matrix

### Phase 0 — Foundation (P0, do first)

```bash
npx shadcn@latest init -d --base radix
npx shadcn@latest add sheet dialog command carousel card badge skeleton empty scroll-area separator sonner form field input label textarea select accordion popover
```

**Token merge:** Map shadcn `--background`, `--card`, `--primary` to existing `kap-purple`, `kira-*` in `globals.css` — do not overwrite glass utilities.

**react-best-practices:**
- `bundle-barrel-imports` — import Lucide icons by name, not `lucide-react` barrel
- `server-cache-react` — wrap MCP category fetches in `React.cache()` on RSC pages
- `async-parallel` — `/shop` page: `Promise.all([categories, trending, rails])`

### Phase 1 — Store surfaces (P0)

| Surface | Replace | Source block | Free? |
|---------|---------|--------------|-------|
| `StoreNav` | HyperUI Header Dark + shadcnblocks ecommerce-navbar patterns | HyperUI + shadcn Navigation Menu | Partial |
| `GiftFinder` | **Delete chip wall** → single editable sentence + one CTA | Apple HIG + Cult static hero OR HyperUI Banner | Yes |
| `StoreProductCard` | shadcnblocks `product-card1` | `npx shadcn add @shadcnblocks/product-card1` | **Free** |
| `ShopGrid` | shadcnblocks `product-list1` | Free block | **Free** |
| `ProductRail` | Aceternity Apple Cards Carousel | `@aceternity/apple-cards-carousel` | Free via registry |
| `CartDrawer` | shadcnblocks `shopping-cart2` inside shadcn Sheet | Free block | **Free** |
| `StoreFooter` | Accordion FAQ + mega-footer columns | shadcn Accordion + Shadcn Studio footer ref | Free |
| `TrustBar` | DaisyUI Stat pattern (retokened) or HyperUI Feature Grid | Structure only | Yes |

### Phase 2 — Chat surfaces (P0)

| Surface | Change | Source |
|---------|--------|--------|
| `KiraExperience` hero | Input + **one** starter prompt; chips after first message | Apple HIG deference |
| `kira-chat-input` | Opaque surface; remove fake attach | 21st AI prompt box OR keep + fix |
| `ThinkingBlock` | Animated Beam: Kira → MCP tool nodes | Magic UI `@magicui/animated-beam` |
| `ProductCard` (chat) | Opaque card + delivery badge; Spotlight hover | React Bits Spotlight + shadcn Card |
| `CommerceRail` | Collapse to summary line; remove duplicate cart CTA | Apple Wallet chip strip |
| `QuickReplies` | Context-only (post-message), not hero | Macy's Ask pattern |

### Phase 3 — Checkout & tracking (P1)

| Surface | Source |
|---------|--------|
| `CheckoutModal` | shadcnblocks checkout2 layout inside Dialog |
| `OrderTracker` / `/track` | Aceternity Tracing Beam OR shadcnblocks timeline20 |
| `ProductDetailClient` | shadcnblocks product-detail1 + Accordion for delivery |

### Phase 4 — Motion & polish (P1)

| Item | Source | Dynamic import? |
|------|--------|-----------------|
| Apple Cards Carousel | Aceternity | `next/dynamic` on `/shop` |
| Animated Beam | Magic UI | `next/dynamic` in ThinkingBlock |
| Hero Color Panels | Cult UI | **Only if** static gradient insufficient |
| Dark Veil background | React Bits | `next/dynamic`, `prefers-reduced-motion: reduce` → off |

### Explicitly SKIP

- Tremor, DaisyUI plugin, Watermelon dashboard suite
- React Bits: Blob Cursor, Splash Cursor, Hyperspeed, Ballpit
- Aceternity: Background Beams + Aurora on same page
- shadcnblocks Pro blocks until free tier exhausted (or user buys $149 key)
- Bento grids, KPI cards, newsletter capture footers

---

## Page-by-page target state

### `/` — Kira (challenge surface)
**Job:** Send a gift to Sri Lanka via conversation.

**Above fold:** Kira greeting (Blur Text, once) + opaque composer + one example prompt.  
**Not above fold:** CommerceRail collapsed; no occasion/category chip walls.  
**After first message:** QuickReplies, product carousel (Apple Cards style), delivery, cart.  
**Thinking:** Animated Beam to MCP tools (functional).  
**Cart:** Header bag only — remove floating + CommerceRail duplicate.

### `/shop` — Storefront
**Job:** Discover gifts or open Kira with intent.

**Above fold:** Light canvas. Hero = one headline + one sentence editor ("Gift for Mom in Colombo, under Rs 10,000") + **Ask Kira** (single CTA). Product photography in Apple Cards Carousel.  
**Below fold:** One occasion strip OR category rail — not both above fold. Editorial rails. FAQ accordion. Mega-footer with trust (islandwide, MCP live, WhatsApp 1297).

### `/shop/[slug]` — Category
Light grid. Sticky filter bar (shadcn). Inline banner: "Not sure? Ask Kira" — text link, not gradient button.

### `/product/[id]` — PDP
Cinematic image on white. Price + delivery badge + Add to bag. Accordion: delivery details, perishables, gift message. Ask Kira — secondary outline button.

### `/track` — Order status
Single input. Tracing Beam timeline on result. No marketing chrome.

---

## Implementation phases & gates

### Phase 0 — Stop the bleeding (1 session)
- [ ] `shadcn init` + P0 primitives
- [ ] Token refactor: semantic colors, kill hardcoded hex in components
- [ ] Remove: ping badges, "rebuilt for 2026", fake attach, gradient CTAs
- [ ] Fix P0: single CTA GiftFinder; collapse Kira hero chips
- [ ] **Gate:** Apple R0 Purpose ≥75

### Phase 1 — Light commerce shell (1–2 sessions)
- [ ] Light theme on store routes only
- [ ] Install free shadcnblocks: product-card1, product-list1, shopping-cart2
- [ ] Rebuild StoreNav, ShopGrid, StoreProductCard from blocks
- [ ] Accordion FAQ + footer
- [ ] **Gate:** R3 Craft ≥34/40 fast-path; no glass on content cards

### Phase 2 — Chat craft (1 session)
- [ ] Opaque chat input; Animated Beam thinking
- [ ] Apple Cards carousel in chat product rail
- [ ] CommerceRail → summary strip; one cart affordance
- [ ] 44px touch targets audit
- [ ] **Gate:** R2 Agency zero P0; R1 ≤1 CTA per viewport

### Phase 3 — Signature motion (1 session)
- [ ] Dynamic-import Aceternity carousel + Magic UI beam
- [ ] `prefers-reduced-motion` global degrade
- [ ] Tracing Beam on `/track`
- [ ] **Gate:** ≤2 motion effects per page

### Phase 4 — Apple Design Head re-review
- [ ] Screenshot matrix: 320/375/1024/1280 × light store + dark chat
- [ ] Target **≥93 SHIP**
- [ ] Run `node scripts/run-tests.mjs` + manual demo script

---

## react-best-practices checklist (per phase)

| Rule | Apply where |
|------|-------------|
| `bundle-dynamic-imports` | Aceternity carousel, Magic UI beam, Cult hero shaders |
| `bundle-barrel-imports` | Lucide direct imports |
| `async-parallel` | `/shop` server fetches |
| `server-cache-react` | Category + product list RSC |
| `rerender-memo` | ProductCard, StoreProductCard in grids |
| `rerender-derived-state-no-effect` | GiftFinder prompt — derive sentence in render, not useEffect |
| `client-localstorage-schema` | CartContext — version key (already partially done) |
| `rendering-content-visibility` | Long ShopGrid lists |

---

## shadcn composition recipes (from skill)

| Use case | Stack |
|----------|-------|
| Store home | Card rails + Carousel + Badge + Separator |
| Cart | Sheet + Scroll Area + Button + Separator |
| Checkout | Dialog + Form + Field + AlertDialog confirm before pay link |
| Search | Command + Dialog (⌘K on /shop) |
| Track | Form + Input + Timeline (custom or Tracing Beam) |
| FAQ footer | Accordion + Card |

**Anti-patterns to avoid:** nested cards, raw `<button>` when Button exists, Dialog for destructive (use AlertDialog), arbitrary `rounded-[N]` instead of `--radius`.

---

## Open decisions (need your call)

1. **Light store / dark chat split** — recommended. OK?
2. **shadcnblocks Pro ($149)** — free tier covers P0; Pro unlocks navbar, hero, timeline, checkout polish. Buy or stay free?
3. **Cult UI Hero Color Panels** — shader hero on `/shop` vs clean HyperUI banner (less GPU, more Apple)?
4. **DM Serif** — keep for one headline per page, or go full system sans?
5. **Implementation order** — Phase 0 first (kill slop) before any new blocks, or parallel?

---

## Success criteria

| Metric | Current | Target |
|--------|---------|--------|
| Apple Design score | 74 | ≥93 |
| P0 findings | 2 | 0 |
| P1 findings | 15 | ≤2 |
| shadcn primitives installed | 0 | 15+ |
| Real blocks from your bookmarks | 1 (chat-input) | 20+ adapted |
| Glass on content cards | Yes | No |
| Primary CTAs per viewport | 2–5 | 1 |
| Motion effects per page | Unbounded | ≤2 |

---

## What we are NOT doing

- Copying kapruka.com visual design (we're replacing the *experience*, not the 2010s purple marketplace look)
- Adding dashboard/analytics (Tremor)
- Pasting Aceternity backgrounds on every page
- Building another chip wall with different CSS
- Shipping until Apple Design Head says SHIP
