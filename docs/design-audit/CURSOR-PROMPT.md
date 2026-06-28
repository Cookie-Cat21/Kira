# Cursor Master Prompt — Kira /shop Storefront Redesign

You are working on **Kira**, an AI shopping companion for Kapruka (Sri Lanka's largest online gifting platform). The app is built with **Next.js 16.2.7 (App Router, React 19)** and **Tailwind v4** (CSS `@theme` tokens in `app/globals.css` — NOT Tailwind v3 config). Read `AGENTS.md` before writing any Next.js code.

The storefront lives at `/shop` (`app/shop/page.tsx`). It currently looks bad — placeholder boxes with no images, weak typography, no visual hierarchy. You need to redesign it by stealing patterns from two reference sites we audited: **empi.re** and **kaleidojewellery.com**. The full audit with exact CSS values is in `docs/design-audit/AUDIT.md`. Read it before writing a single line.

---

## What you're building

Ten components, in priority order. Do them one at a time, test each before moving on.

---

### 1. Announcement bar marquee (top of `/shop`)

Replace or add above `StoreNav`. A thin colored bar with infinite-scroll marquee text.

**Spec:**
- Background: `#f8da08` (Kapruka yellow, existing token `kap-yellow`) or dark purple `#402970` (`kap-purple`) — pick whichever contrasts better with what's below
- Text: `"🎂 Cakes · 💐 Flowers · 🎁 Hampers · 🍫 Chocolates · Islandwide delivery · 30+ cities · Powered by Kira ✨"` repeated
- Animation: pure CSS `@keyframes marquee` infinite scroll (no library needed)
- Font: 12px, letter-spacing 0.05em, font-weight 500
- Height: 32px
- Reference: Kaleido's lavender bar + store.empi.re's "| 100% INDEPENDENT |" ticker

---

### 2. Marquee ticker strip (below StoreNav or below hero)

A second, darker marquee strip — visual separator, not functional.

**Spec:**
- Background: `#000` or `var(--kira-canvas)` (very dark)
- Text: `"| ISLANDWIDE DELIVERY | COLOMBO | KANDY | GALLE | JAFFNA | MATARA | NEGOMBO |"` in uppercase, looping
- Font: Bebas Neue or Anton SC (add via Google Fonts in `app/layout.tsx`) — this is the bold display font equivalent of Empire's Druk Wide Web
- If you can't load Bebas Neue, use `font-display` which is DM Serif Display (already loaded)
- Height: 40px, font-size 13-14px uppercase

---

### 3. Section heading pattern (apply to ALL section headings in `/shop`)

Every section title in the storefront needs to follow this pattern:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-4xl font-black uppercase tracking-tight">SHOP BY CATEGORY</h2>
  <Link href="/shop" className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/70 hover:bg-white/10">
    View All →
  </Link>
</div>
```

Apply to: "Shop by Category", "Trending Now", "Send a Gift", any other section headers that currently use small weak typography.

---

### 4. Category filter pill row (top of product sections)

A horizontal scrollable row of filter chips. Clicking one filters the products shown below.

**Spec:**
- Pills: `All · Cakes · Flowers · Hampers · Chocolates · Plants · Candles`
- Inactive state: transparent bg, white/20 border, white/60 text
- Active state: white bg, black text (inverted)
- Border-radius: 999px (full pill)
- Gap: 8px between chips
- Scroll: `overflow-x-auto` with hidden scrollbar on mobile
- Reference: Empire `/shop/clothing` filter chip row

---

### 5. Black filled pill badge on product cards

In `app/components/ProductCard.tsx`, add a category badge chip top-left of the card image.

**Spec:**
- Position: `absolute top-3 left-3`
- Style: `bg-black text-white text-[11px] font-semibold uppercase tracking-[0.05em] rounded-full px-2.5 py-1`
- Content: derive from `product.category` — map it: `"cakes" → "CAKE"`, `"flowers" → "FLOWERS"`, `"hampers" → "HAMPER"`, `"chocolates" → "CHOC"`, default `"GIFT"`
- Reference: Empire's exact black pill badge pattern (see AUDIT.md)

---

### 6. Price-in-CTA button

In `app/components/ProductCard.tsx`, the "Add to Cart" button should show the price inline.

**Spec:**
- Text: `Add to Cart — LKR {price.toLocaleString()}`
- Style: full-width, dark bg, white text — match existing cart button styles
- Reference: Kaleido's `"Add to Bag — S$32.90"` CTA pattern

---

### 7. Circular sub-category navigator

A row of circles for browsing by occasion/category. Place this in `/shop` above the product grid.

**Spec:**
```tsx
const OCCASIONS = [
  { label: "Birthday",     icon: "🎂", href: "/shop/cakes" },
  { label: "Anniversary",  icon: "💐", href: "/shop/flowers" },
  { label: "Hampers",      icon: "🎁", href: "/shop/hampers" },
  { label: "Chocolates",   icon: "🍫", href: "/shop/chocolates" },
  { label: "Plants",       icon: "🪴", href: "/shop/plants" },
  { label: "New In",       icon: "✨", href: "/shop" },
]
```
- Each circle: 96×96px, bg `rgba(255,255,255,0.08)` (glass), border-radius 50%, centered emoji (32px) + label below (11px, white/70)
- Hover: bg `rgba(255,255,255,0.14)`, scale 1.05
- Layout: horizontal flex, centered, gap 24px, overflow-x-auto on mobile
- Reference: Kaleido's 100×100px `#EEEEEE` circles on the Bestsellers page

---

### 8. Lifestyle photo category grid

In `app/components/store/CategoryRail.tsx` (or wherever the category section lives), replace empty placeholder boxes with a proper grid.

**Spec:**
- 3 columns on desktop, 2 on tablet, 1 on mobile
- Each tile: 16:9 or 4:5 aspect ratio, full-bleed background image, white label text bottom-left (24px, font-weight 600)
- Images: Use Kapruka product images from the MCP if possible, otherwise use these Unsplash placeholder URLs as the placeholder (swap with real images later):
  - Cakes: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600`
  - Flowers: `https://images.unsplash.com/photo-1490750967868-88df5691cc8b?w=600`
  - Hampers: `https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600`
  - Chocolates: `https://images.unsplash.com/photo-1511381939415-e44015466834?w=600`
  - Plants: `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600`
  - Candles: `https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600`
- On hover: scale image 1.05, darken overlay
- Reference: Kaleido's 6-col lifestyle photo grid with white label bottom-left

---

### 9. Editorial 2-column feature panels

Two large feature panels below the product grid. Full-bleed bg image on left, text + CTA on right (or reversed).

**Panel 1 — "Send a gift to Sri Lanka":**
- Left: dark lifestyle photo (hamper, flowers arrangement)
- Right: Large heading "Send something they'll remember.", subtitle "Delivered islandwide. Same-day available in Colombo.", CTA button "Browse gifts →"

**Panel 2 — "Kira finds it for you":**
- Left: heading "Not sure what to get?", subtitle "Tell Kira who it's for and she'll find the perfect gift, check delivery, and check you out.", CTA button "Ask Kira →" (opens KiraDock)
- Right: dark lifestyle photo or the existing Kira chat screenshot

**Spec:**
- Each panel: `min-height: 400px`, rounded-2xl, overflow-hidden
- Image half: `object-cover`, full width+height
- Text half: dark bg (`var(--kira-canvas)` or `#1a0f33`), generous padding, heading in DM Serif or bold sans
- CTA: existing `glass-card` or white button style
- Reference: Kaleido's full-bleed editorial panels + Empire's section layout

---

### 10. "Ask Kira" fixed side tab

A rotated "Ask Kira ✨" text tab fixed to the right viewport edge on all store pages (`/shop`, `/shop/[slug]`, `/product/[id]`). Clicking it opens the KiraDock.

**Spec:**
- Position: `fixed right-0 top-1/2 -translate-y-1/2 z-50`
- Style: `bg-kap-purple text-white text-xs font-semibold uppercase tracking-widest`
- Shape: `rounded-l-lg px-2 py-4`
- Text rotated: `writing-mode: vertical-rl; transform: rotate(180deg)`
- On click: call `useKiraDock().open()`
- Hide on `/` (the main Kira page) and on any page where `KiraDock` is already open
- Reference: Kaleido's fixed "OFFERS" tab on right edge — but ours is purple + Kira branding

---

## Fonts to add

In `app/layout.tsx`, add to the `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />
```

In `app/globals.css` `@theme` block, add:
```css
--font-display-bold: 'Bebas Neue', 'Anton SC', sans-serif;
--font-outfit: 'Outfit', sans-serif;
```

Use `font-display-bold` (or Tailwind class `font-[family-name:var(--font-display-bold)]`) for all the big section headings and the marquee tickers. Use `font-outfit` for product card names and sub-labels.

---

## Architecture rules (DO NOT BREAK)

- **Tailwind v4** — all tokens are CSS `@theme` variables in `app/globals.css`. No `tailwind.config.js`. Do not write `theme.extend`.
- **App Router** — all client components must have `"use client"` at the top. No `getServerSideProps` or `getStaticProps`.
- **KiraExperience** stays at `/` — do NOT move it. The storefront is at `/shop`.
- **KiraDock** is the slide-over chat on store pages — use `useKiraDock()` from `app/context/KiraDockContext.tsx` to open it.
- **Do not add polling or retry loops** against any MCP/API endpoints.
- **Run `npm run build` before finishing** — there are existing lint warnings; do not introduce new TypeScript errors.

---

## Files most likely to touch

- `app/shop/page.tsx` — storefront home, add the circular nav + feature panels
- `app/components/store/StoreHero.tsx` — replace HeroTile placeholders
- `app/components/store/CategoryRail.tsx` — lifestyle photo grid
- `app/components/store/StoreNav.tsx` — add announcement bar above it
- `app/components/ProductCard.tsx` — add badge chip + price-in-CTA
- `app/layout.tsx` — add Google Fonts
- `app/globals.css` — add font tokens + marquee keyframe animation
- New file: `app/components/store/MarqueeTicker.tsx`
- New file: `app/components/store/AskKiraTab.tsx`
- New file: `app/components/store/OccasionCircles.tsx`
