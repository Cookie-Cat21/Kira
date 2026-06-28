# Cursor Master Prompt — Kira /shop Storefront Redesign

You are working on **Kira**, an AI shopping companion for Kapruka (Sri Lanka's largest online gifting platform). The app is built with **Next.js 16.2.7 (App Router, React 19)** and **Tailwind v4** (CSS `@theme` tokens in `app/globals.css` — NOT Tailwind v3 config). Read `AGENTS.md` before writing any Next.js code.

The storefront lives at `/shop` (`app/shop/page.tsx`). It currently looks bad — placeholder boxes with no images, weak typography, no visual hierarchy. You need to redesign it by stealing patterns from two reference sites we audited: **empi.re** and **kaleidojewellery.com**.

## Before you write any code

1. Read [`docs/design-audit/KIRA-GAPS.md`](./KIRA-GAPS.md) — what's broken in current `/shop`
2. Read [`docs/design-audit/PATTERNS.md`](./PATTERNS.md) — exact specs for each pattern
3. **Open the screenshot** for the component you're building (paths below)
4. Read [`docs/design-audit/AUDIT.md`](./AUDIT.md) for full CSS values

Screenshots are in `docs/design-audit/screenshots/`. Open them side-by-side while coding.

---

## What you're building

Ten components, in priority order. **Do them one at a time, test each in the browser before moving on.**

---

### 1. Announcement bar marquee (top of `/shop`)

**Reference screenshot:** `screenshots/kaleido/home/viewport-top.png` (lavender bar) + `screenshots/empire/home/viewport-top.png` (black bar)

Replace or add above `StoreNav`. A thin colored bar with infinite-scroll marquee text.

**Spec:**
- Background: `#f8da08` (Kapruka yellow, `kap-yellow`) or `#402970` (`kap-purple`)
- Text: `"🎂 Cakes · 💐 Flowers · 🎁 Hampers · 🍫 Chocolates · Islandwide delivery · 30+ cities · Powered by Kira ✨"` repeated
- Animation: pure CSS `@keyframes marquee` (see `AUDIT.md`) — no library
- Font: 12px, letter-spacing 0.05em, font-weight 500
- Height: 32px

---

### 2. Marquee ticker strip (below StoreNav or below hero)

**Reference screenshot:** `screenshots/empire/store-home/viewport-top.png` (bottom black bar)

**Spec:**
- Background: `#000` or `var(--kira-canvas)`
- Text: `"| ISLANDWIDE DELIVERY | COLOMBO | KANDY | GALLE | JAFFNA | MATARA | NEGOMBO |"` uppercase, looping
- Font: Bebas Neue (add via Google Fonts) — Empire's Druk Wide Web equivalent
- Height: 40px, font-size 13-14px uppercase

---

### 3. Section heading pattern (apply to ALL section headings)

**Reference screenshot:** `screenshots/empire/home/scroll-1800.png` (SHOP heading + All Products pill)

Every section title needs this pattern:

```tsx
<div className="flex items-center justify-between">
  <h2 className="font-[family-name:var(--font-display-bold)] text-4xl font-black uppercase tracking-tight text-white">
    SHOP BY CATEGORY
  </h2>
  <Link href="/shop" className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/70 hover:bg-white/10">
    View All →
  </Link>
</div>
```

Apply to: `shop/page.tsx` category heading, every `ProductRail` title. Current `text-2xl` is too small.

---

### 4. Category filter pill row (top of product sections)

**Reference screenshot:** `screenshots/empire/shop-clothing/viewport-top.png`

**Spec:**
- Pills: `All · Cakes · Flowers · Hampers · Chocolates · Plants · Candles`
- Inactive: transparent bg, `border-white/20`, `text-white/60`
- Active: `bg-white text-black` (inverted)
- Border-radius: 999px, gap 8px, `overflow-x-auto scrollbar-hide`

---

### 5. Black filled pill badge on product cards

**Reference screenshot:** `screenshots/empire/shop-clothing/scroll-0.png`

In `app/components/store/StoreProductCard.tsx`, add category badge top-left of card image.

**Spec:**
- Position: `absolute top-3 left-3`
- Style: `bg-black text-white text-[11px] font-semibold uppercase tracking-[0.05em] rounded-full px-2.5 py-1`
- Content: map `product.category` → `"CAKE"` / `"FLOWERS"` / `"HAMPER"` / `"CHOC"` / `"GIFT"`

---

### 6. Price-in-CTA button

**Reference screenshot:** `screenshots/kaleido/pdp-sample/viewport-top.png` + `screenshots/empire/pdp-snapback/viewport-top.png`

In `StoreProductCard.tsx`, replace the tiny `+` icon button with a full-width CTA showing price.

**Spec:**
- Text: `Add to Cart — LKR {price.toLocaleString()}`
- Style: full-width, dark bg (`bg-white/10 hover:bg-kap-purple`), white text, `rounded-lg py-2.5 text-sm font-semibold`
- Show below product name, above or replacing the current `+` button row

---

### 7. Circular sub-category navigator

**Reference screenshot:** `screenshots/kaleido/bestsellers/viewport-top.png`

Place in `/shop` above the product grid. New file: `OccasionCircles.tsx`.

**Spec:**
```tsx
const OCCASIONS = [
  { label: "Birthday",    icon: "🎂", href: "/shop/cakes" },
  { label: "Anniversary", icon: "💐", href: "/shop/flowers" },
  { label: "Hampers",     icon: "🎁", href: "/shop/hampers" },
  { label: "Chocolates",  icon: "🍫", href: "/shop/chocolates" },
  { label: "Plants",      icon: "🪴", href: "/shop/plants" },
  { label: "New In",      icon: "✨", href: "/shop" },
]
```
- Each circle: 96×96px, `bg-white/[0.08]`, `rounded-full`, emoji 32px + label 11px `text-white/70` below
- Hover: `bg-white/[0.14] scale-105`
- Layout: horizontal flex, centered, gap 24px, `overflow-x-auto` on mobile

---

### 8. Lifestyle photo category grid

**Reference screenshot:** `screenshots/kaleido/home/scroll-900.png`

Replace `CategoryRail.tsx` placeholder icon cards with a photo grid.

**Spec:**
- 3 columns desktop, 2 tablet, 1 mobile
- Each tile: 4:5 aspect ratio, full-bleed `background-image`, white label bottom-left (24px, font-weight 600)
- Unsplash placeholders (swap with Kapruka MCP images later):
  - Cakes: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600`
  - Flowers: `https://images.unsplash.com/photo-1490750967868-88df5691cc8b?w=600`
  - Hampers: `https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600`
  - Chocolates: `https://images.unsplash.com/photo-1511381939415-e44015466834?w=600`
  - Plants: `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600`
  - Candles: `https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600`
- Hover: `scale-105` on image + darken overlay

---

### 9. Editorial 2-column feature panels

**Reference screenshot:** `screenshots/kaleido/home/scroll-900.png`

Two panels below the product grid in `shop/page.tsx`.

**Panel 1 — "Send a gift to Sri Lanka":**
- Left: lifestyle photo · Right: "Send something they'll remember." + "Browse gifts →"

**Panel 2 — "Kira finds it for you":**
- Left: "Not sure what to get?" + "Ask Kira →" · Right: lifestyle photo

**Spec:** `min-height: 400px`, `rounded-2xl overflow-hidden`, image half `object-cover`, text half dark bg with generous padding.

---

### 10. "Ask Kira" fixed side tab

**Reference screenshot:** `screenshots/kaleido/home/viewport-top.png` (OFFERS tab on right edge)

New file: `AskKiraTab.tsx`. All store pages except `/`.

**Spec:**
- `fixed right-0 top-1/2 -translate-y-1/2 z-50`
- `bg-kap-purple text-white text-xs font-semibold uppercase tracking-widest`
- `rounded-l-lg px-2 py-4`
- `writing-mode: vertical-rl; transform: rotate(180deg)`
- On click: `useKiraDock().open()`

---

## Fonts to add

In `app/layout.tsx`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />
```

In `app/globals.css` `@theme`:
```css
--font-display-bold: 'Bebas Neue', sans-serif;
--font-outfit: 'Outfit', sans-serif;
```

---

## Architecture rules (DO NOT BREAK)

- **Tailwind v4** — tokens in `app/globals.css` `@theme`. No `tailwind.config.js`.
- **App Router** — `"use client"` on client components. No `getServerSideProps`.
- **KiraExperience** stays at `/` — do NOT move it.
- **KiraDock** — use `useKiraDock()` from `app/context/KiraDockContext.tsx`.
- **No polling/retry loops** against MCP/API.
- **Run `npm run build`** before finishing.

---

## Files to touch

| File | Change |
|---|---|
| `app/shop/page.tsx` | Add occasion circles, editorial panels, upgrade headings |
| `app/components/store/StoreHero.tsx` | Replace HeroTile placeholders with real images |
| `app/components/store/CategoryRail.tsx` | Lifestyle photo grid |
| `app/components/store/StoreNav.tsx` | Announcement bar above nav |
| `app/components/store/StoreProductCard.tsx` | Badge chip + price-in-CTA |
| `app/components/store/ProductRail.tsx` | Section heading pattern |
| `app/layout.tsx` | Google Fonts |
| `app/globals.css` | Font tokens + marquee keyframe |
| `app/components/store/MarqueeTicker.tsx` | **NEW** |
| `app/components/store/AskKiraTab.tsx` | **NEW** |
| `app/components/store/OccasionCircles.tsx` | **NEW** |

---

## Re-capturing reference screenshots

```bash
node scripts/capture-design-audit.mjs
```

Output: `docs/design-audit/screenshots/{empire,kaleido}/{page}/`
