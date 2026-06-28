# Design Audit — empi.re + kaleidojewellery.com

*Captured Jun 2026 · 11 pages · viewport screenshots + computed CSS from live DOM*

> **Start here:** [`README.md`](./README.md) for folder index · [`PATTERNS.md`](./PATTERNS.md) for stealable patterns · [`KIRA-GAPS.md`](./KIRA-GAPS.md) for what Kira is missing

---

## Screenshot map

| Site | Page | Screenshot |
|---|---|---|
| Empire | Home | `screenshots/empire/home/viewport-top.png` |
| Empire | Shop Clothing | `screenshots/empire/shop-clothing/viewport-top.png` |
| Empire | PDP Snapback | `screenshots/empire/pdp-snapback/viewport-top.png` |
| Empire | store.empi.re | `screenshots/empire/store-home/viewport-top.png` |
| Kaleido | Home | `screenshots/kaleido/home/viewport-top.png` |
| Kaleido | Bestsellers | `screenshots/kaleido/bestsellers/viewport-top.png` |
| Kaleido | PDP | `screenshots/kaleido/pdp-sample/viewport-top.png` |

Full page indexes: [`empire/INDEX.md`](./empire/INDEX.md) · [`kaleido/INDEX.md`](./kaleido/INDEX.md)

---

## EMPIRE (empi.re) — Verified Audit

### Typography (measured from live DOM)

| Role | Font | Size | Weight | Transform | Tracking |
|---|---|---|---|---|---|
| Hero heading | Druk Wide Web Medium | **72px** | 500 | UPPERCASE | +0.3px |
| Section heading | Druk Wide Web Medium | **47px** | 500 | none | -1.25px |
| Hero subtitle | Test Söhne Buch | **47px** | 400 | none | -1.85px |
| Product title (PDP) | Test Söhne Kräftig | **30px** | 500 | none | -1.25px |
| UI / nav | Inter / sans-serif | 12–14px | 400 | — | — |

### Color Palette

| Token | Value | Use |
|---|---|---|
| bg | `#ffffff` | Body, cards |
| text | `#000000` | All text |
| card-bg | `#f5f5f5` | Product cards |
| announcement | `#000` bg / `#fff` text | Top bar |
| badge-filled | `#000` bg / `#fff` text | Card type chips |
| footer-bg | `rgb(0,0,0)` | Footer |

### Component Inventory

See [`empire/INDEX.md`](./empire/INDEX.md) for full page-by-page breakdown with screenshot refs.

**Key patterns to steal:**
1. Black announcement bar (`home/viewport-top.png`)
2. Marquee ticker `| 100% INDEPENDENT |` (`store-home/viewport-top.png`)
3. Section heading + pill CTA row (`home/scroll-1800.png`)
4. Filter pill row with filled-black active state (`shop-clothing/viewport-top.png`)
5. Black pill badge on product cards (`shop-clothing/scroll-0.png`)
6. Price in CTA row on PDP (`pdp-snapback/viewport-top.png`)

---

## KALEIDO (kaleidojewellery.com) — Verified Audit

### Typography (measured from live DOM)

| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero/display | Outfit | **120px** | 600 | -1px |
| Page heading | Outfit | **48px** | 600 | -0.5px |
| Section heading | Outfit | **38px** | 600 | -0.4px |
| Nav/category labels | Outfit | **14px** | 500 | +0.1px |
| Body/UI | Geist | **13px** | 400 | normal |
| Product tags | Geist | **12px** | 400 | +0.1px |

### Color Palette

| Token | Value | Use |
|---|---|---|
| body-bg | `#ffffff` | Body |
| body-text | `rgb(31,31,31)` | All text |
| announcement | `#E8A5EA` | Top bar (lavender) |
| secondary-bar | `#F7D170` | Yellow utility bar |
| card-bg | `#F9F8F4` | Product cards (warm off-white) |
| sub-cat-circle | `#EEEEEE` | Category circle bg |
| cta-btn | `rgb(31,31,31)` | "Add to Bag" button |
| discount-tag | `#E8A5EA` | Lavender discount chip |

### Component Inventory

See [`kaleido/INDEX.md`](./kaleido/INDEX.md) for full page-by-page breakdown.

**Key patterns to steal:**
1. Lavender announcement marquee (`home/viewport-top.png`)
2. 6-col lifestyle category photo grid (`home/scroll-900.png`)
3. Circular 100px sub-category navigator (`bestsellers/viewport-top.png`)
4. White rect product tags + warm card bg (`bestsellers/computed-styles.json`)
5. "Add to Bag — S$32.90" price-in-CTA (`pdp-sample/viewport-top.png`)
6. OFFERS fixed side tab (`home/viewport-top.png` right edge)
7. Editorial full-bleed promo panels (`home/scroll-900.png`)

---

## Kira Implementation Plan

### MUST BUILD (highest impact)

| # | Component | Inspired By | Screenshot | Kira file |
|---|---|---|---|---|
| 1 | Colored announcement marquee | Kaleido | `kaleido/home/viewport-top.png` | `StoreNav.tsx` or new bar above |
| 2 | Marquee ticker strip | Empire store | `empire/store-home/viewport-top.png` | `MarqueeTicker.tsx` |
| 3 | HUGE section heading + pill CTA | Empire | `empire/home/scroll-1800.png` | `ProductRail.tsx`, `shop/page.tsx` |
| 4 | Category filter pill row | Empire clothing | `empire/shop-clothing/viewport-top.png` | `shop/[slug]/page.tsx` |
| 5 | Black pill badge on cards | Empire | `empire/shop-clothing/scroll-0.png` | `StoreProductCard.tsx` |
| 6 | Circular sub-category nav | Kaleido | `kaleido/bestsellers/viewport-top.png` | `OccasionCircles.tsx` |
| 7 | Lifestyle photo category grid | Kaleido | `kaleido/home/scroll-900.png` | `CategoryRail.tsx` |
| 8 | Editorial 2-col panels | Kaleido | `kaleido/home/scroll-900.png` | `shop/page.tsx` |
| 9 | Price-in-CTA button | Kaleido + Empire | `kaleido/pdp-sample/viewport-top.png` | `StoreProductCard.tsx` |
| 10 | Ask Kira side tab | Kaleido OFFERS | `kaleido/home/viewport-top.png` | `AskKiraTab.tsx` |

### NICE TO HAVE

| Component | Inspired By | Screenshot |
|---|---|---|
| Left sidebar filter | Empire clothing | `empire/shop-clothing/viewport-top.png` |
| Artist spotlight banner | Empire shop | `empire/shop-all/viewport-top.png` |
| STACK & SAVE upsell | Kaleido PDP | `kaleido/pdp-sample/viewport-top.png` |
| Color swatch dots | Kaleido cards | `kaleido/bestsellers/scroll-0.png` |
| Newsletter signup | Kaleido footer | — |
| Promo tiles in grid | Kaleido sale | `kaleido/sale/viewport-top.png` |

---

## Key CSS to copy

```css
/* Empire badge chip — USE THIS on Kira product cards */
.empire-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #000;
  color: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Kaleido product card (warm bg — adapt to glass for dark theme) */
.kaleido-card {
  background: rgb(249, 248, 244);
  border-radius: 8px;
}

/* Kaleido sub-category circle */
.kaleido-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #EEEEEE;
}

/* Kaleido price-in-CTA */
.kaleido-cta {
  background: rgb(31, 31, 31);
  color: #fff;
  border-radius: 4px;
  padding: 14px;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
}

/* Marquee animation */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 30s linear infinite;
}

/* Empire section heading */
.empire-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.empire-section-header h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2rem, 5vw, 3rem);
  text-transform: uppercase;
  font-weight: 900;
}
```

---

## Fonts — Free Equivalents

| Reference font | Free substitute | Use in Kira |
|---|---|---|
| Druk Wide Web | **Bebas Neue** (Google Fonts) | Section headings, marquee ticker |
| Test Söhne Kräftig | DM Sans Bold | Product titles |
| Outfit | Outfit (same!) | Product names, sub-labels |
| Geist | Inter / Geist | Body UI |
| GTStandard-M italic | Playfair Display Italic | Optional hero accent |

Kira already has: DM Serif (display) + Jakarta (body). **Add Bebas Neue for section headings only.**
