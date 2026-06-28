# Cross-Site Design Patterns

Patterns that appear on one or both reference sites. Each maps to a Kira component to build.

---

## 1. Announcement marquee bar

| | Empire | Kaleido | Kira adaptation |
|---|---|---|---|
| **Screenshot** | `empire/home/viewport-top.png` | `kaleido/home/viewport-top.png` | — |
| **Height** | ~32px | ~32px | 32px |
| **Background** | `#000` | `#E8A5EA` lavender | `#f8da08` kap-yellow OR `#402970` kap-purple |
| **Text** | "GET 10% OFF" static | Scrolling promo text | Scrolling: "🎂 Cakes · 💐 Flowers · 🎁 Hampers · Islandwide delivery · Powered by Kira ✨" |
| **Animation** | None (static) | CSS marquee infinite | `@keyframes marquee` — translateX loop |
| **Font** | 12px, white, centered | 12px, dark, scrolling | 12px, weight 500, letter-spacing 0.05em |

**Implementation:** Pure CSS, no library. Place above `StoreNav`.

---

## 2. Marquee ticker strip (brand separator)

| | Empire store | Kira adaptation |
|---|---|---|
| **Screenshot** | `empire/store-home/viewport-top.png` bottom | — |
| **Background** | `#000` | `var(--kira-canvas)` or `#000` |
| **Text** | `\| 100% INDEPENDENT \|` repeated | `\| ISLANDWIDE DELIVERY \| COLOMBO \| KANDY \| GALLE \| … \|` |
| **Font** | Druk Wide Web | Bebas Neue (Google Fonts fallback) |
| **Height** | ~40px | 40px |
| **Transform** | Uppercase | Uppercase |

**Implementation:** New `MarqueeTicker.tsx`. Place below hero or below nav.

---

## 3. Section heading + pill CTA row

| | Empire | Kaleido | Kira adaptation |
|---|---|---|---|
| **Screenshot** | `empire/home/scroll-1800.png` | `kaleido/bestsellers/scroll-0.png` | — |
| **Layout** | `flex justify-between items-center` | Centered page title OR left-aligned rail title | Left: HUGE heading · Right: pill "View All →" |
| **Heading font** | Druk 56–72px uppercase | Outfit 48px 600 | Bebas Neue / `font-display-bold`, `text-4xl font-black uppercase` |
| **CTA pill** | Black filled, white text, rounded-full | N/A on rails | `rounded-full border border-white/20 px-5 py-2` |

**Current Kira gap:** `ProductRail` uses `text-2xl` DM Serif — way too small. Upgrade to Empire-scale headings.

---

## 4. Category filter pill row

| | Empire | Kaleido | Kira adaptation |
|---|---|---|---|
| **Screenshot** | `empire/shop-clothing/viewport-top.png` | `kaleido/bestsellers/viewport-top.png` | — |
| **Items** | Headwear, Outerwear, Tops… | All Filters + Category chip | All · Cakes · Flowers · Hampers · Chocolates · Plants |
| **Inactive** | Transparent, thin border, black text | Outlined, transparent bg | `border-white/20 text-white/60` |
| **Active** | **Black fill, white text** | Black fill (All Filters btn) | `bg-white text-black` |
| **Shape** | `border-radius: 999px` | `border-radius: 4px` (Kaleido) / 999px (Empire) | 999px (Empire style) |
| **Scroll** | Horizontal row | Horizontal row | `overflow-x-auto scrollbar-hide` |

---

## 5. Product card — two badge styles

### Empire style (black pill) — **use for Kira dark theme**

![Empire card](../screenshots/empire/shop-clothing/scroll-0.png)

```
position: absolute top-3 left-3
background: #000
color: #fff
border-radius: 999px
padding: 4px 10px
font-size: 11px
font-weight: 600
text-transform: uppercase
letter-spacing: 0.05em
content: "CAKE" | "FLOWERS" | "HAMPER" | "CHOC"
```

### Kaleido style (white rect tag) — alternative for light cards

```
background: #fff
color: rgb(31,31,31)
font-size: 12px
padding: 1px 6px
border-radius: 4px
content: "Bestseller" | "Same-day"
```

**Card background:** Empire `#f5f5f5` on white site → Kira uses existing `store-card` glass. Kaleido `#F9F8F4` warm off-white could map to `rgba(255,255,255,0.06)`.

---

## 6. Price-in-CTA button

| | Kaleido PDP | Empire PDP | Kira adaptation |
|---|---|---|---|
| **Screenshot** | `kaleido/pdp-sample/viewport-top.png` | `empire/pdp-snapback/viewport-top.png` | — |
| **Text** | "Add to Bag — S$32.90" | "ADD TO CART" + "$45.00 USD" on same row | `Add to Cart — LKR {price}` |
| **Style** | Full-width black, radius 4px | Full-width black, radius ~8px | Full-width, dark bg |
| **Font** | 14px / 500 | 14px uppercase | 14px / 600 |

**Current Kira gap:** `StoreProductCard` shows price separately + tiny `+` icon button. Replace with full-width price-in-CTA on hover or always visible.

---

## 7. Circular sub-category navigator

| | Kaleido | Kira adaptation |
|---|---|---|
| **Screenshot** | `kaleido/bestsellers/viewport-top.png` | — |
| **Size** | 100×100px circles | 96×96px (slightly smaller for mobile) |
| **Background** | `#EEEEEE` | `rgba(255,255,255,0.08)` glass (dark theme) |
| **Content** | Product silhouette image inside | Emoji icon 32px (🎂💐🎁🍫🪴✨) |
| **Label** | Below circle, 14px Outfit 500 | Below circle, 11px white/70 |
| **Layout** | Horizontal flex, centered, gap ~24px | Same, `overflow-x-auto` on mobile |

**Current Kira gap:** `CategoryRail` uses 150px glass cards in a horizontal scroll — completely different pattern. Replace or add `OccasionCircles.tsx` above the grid.

---

## 8. Lifestyle photo category grid

| | Kaleido | Kira adaptation |
|---|---|---|
| **Screenshot** | `kaleido/home/scroll-900.png` | — |
| **Columns** | 6 equal on desktop | 3 desktop · 2 tablet · 1 mobile |
| **Aspect** | Portrait lifestyle shots | 4:5 or 16:9 |
| **Label** | White text bottom-left, 14px 500 | White text bottom-left, 24px 600 |
| **Hover** | Subtle scale on image | `scale-105` + darken overlay |
| **Images** | On-model product photography | Unsplash placeholders → Kapruka MCP images |

**Current Kira gap:** `CategoryRail` has no photos — just colored placeholder tiles with icons.

---

## 9. Editorial 2-column feature panels

| | Kaleido | Kira adaptation |
|---|---|---|
| **Screenshot** | `kaleido/home/scroll-900.png` | — |
| **Layout** | 50/50 split: photo \| text+CTA | Same |
| **Min height** | ~400–500px | 400px |
| **Corners** | Slight radius or full-bleed | `rounded-2xl overflow-hidden` |
| **CTA** | Gold/yellow full-width button at bottom | White or glass button |

**Panels for Kira:**
1. "Send something they'll remember." + islandwide delivery CTA
2. "Not sure what to get?" + Ask Kira CTA

---

## 10. Fixed side tab (OFFERS → Ask Kira)

| | Kaleido | Kira adaptation |
|---|---|---|
| **Screenshot** | `kaleido/home/viewport-top.png` right edge | — |
| **Position** | `fixed right-0 top-1/2 -translate-y-1/2` | Same |
| **Style** | Lavender bg, vertical "OFFERS" text | `bg-kap-purple`, "Ask Kira ✨" |
| **Rotation** | `writing-mode: vertical-rl; rotate(180deg)` | Same |
| **Action** | Opens offers drawer | `useKiraDock().open()` |

---

## Spacing system (measured)

| Token | Empire | Kaleido | Kira recommendation |
|---|---|---|---|
| Page max-width | ~1360px content | 1440px full / 720px centered headers | Keep `max-w-[1280px]` |
| Section vertical gap | ~80–120px between sections | ~80px | Increase from current `mt-28` to `mt-32`+ |
| Grid gap | ~16px (4-col clothing) | 20px (4-col bestsellers) | `gap-5` (20px) |
| Card padding | 0 (image bleeds) | 0 | Keep image full-bleed in card |
| Card body padding | N/A (text below card) | 0 | `p-3.5` current is fine |
| Nav height | ~64px | ~64px | Current `h-16` ✓ |
| Horizontal page padding | ~40px (1440 - 1360) | 40px | Current `px-5 sm:px-8` ✓ |

---

## Component library matches

| Pattern | Closest free component | URL |
|---|---|---|
| Marquee ticker | React Bits Marquee | reactbits.dev |
| Filter chips | HyperUI tabs/chips | hyperui.dev |
| Product card + badge | HyperUI ecommerce cards | hyperui.dev |
| Bento editorial panels | 21st.dev bento grids | 21st.dev |
| Category cards | Shadcnblocks feature sections | shadcnblocks.com |
| Circular nav | Custom (no exact match) | Build from Kaleido spec |
| Side tab | Custom | Build from Kaleido OFFERS tab |

Do NOT import heavy libraries for marquee — pure CSS `@keyframes` is sufficient.
