# Design Audit — empi.re + kaleidojewellery.com
*Pages audited: All major pages on both sites*

---

## EMPIRE (empi.re) — Full Audit

### Typography
| Role | Font | Size | Weight | Transform | Tracking |
|---|---|---|---|---|---|
| Hero/section heading | Druk Wide Web Medium | 72px h1 / 56px h2 | 500 | UPPERCASE | +0.3px |
| Product page heading | Test Söhne Kräftig | ~40px | — | none | — |
| Subheadings/body | Test Söhne Buch | 47px h3 | 400 | none | -1.85px |
| UI | Inter | 12–14px | — | — | — |

### Color Palette
| Token | Value | Use |
|---|---|---|
| bg | `#ffffff` | Body, cards |
| text | `#000000` | All text |
| card-bg | `#f5f5f5` | Product cards |
| announcement | `#000` bg / `#fff` text | Top bar |
| badge-filled | `#000` bg / `#fff` text | Card type chips |
| footer-bg | `rgb(0,0,0)` | Footer |

### Component Inventory (ordered by page)

#### HOME PAGE
1. **Announcement bar** — thin black bar, white text centered, marquee ticker
2. **Nav (transparent overlay)** — left: Home/Shop/News/Contact · center: EMPIRE logo · right: Search + Cart icon
3. **Hero** — 100vw full-bleed portrait photo, transparent nav overlaid, Druk heading at bottom-left, black filled pill CTA
4. **Marquee ticker strip** — `| 100% INDEPENDENT |` repeated · white on black · Druk font · infinite scroll
5. **Section heading pattern** — HUGE left-aligned Druk uppercase heading ("SHOP", "NEWS", "SOCIALS") + black pill CTA right ("All Products", "All News", "Follow Us") — these live on the same row, space-between
6. **Product card** — gray `#f5f5f5` bg · image centered with breathing room · **BLACK FILLED PILL BADGE top-left ("VINYL", "SNAPBACK HAT", "HOODIE")** · product name + price below in small 12-13px text
7. **News editorial cards** — big editorial photo top · badge chip top-left ("NEW ARTIST", "FEATURED", "INTERVIEW", "IMPACT") · title + subtitle below · 3-col grid layout
8. **Footer** — pure black bg, white text, multi-col links + social icons + payment provider icons

#### /shop — ALL PRODUCTS PAGE
9. **Collection hero** — small breadcrumb (SHOP ALL / CLOTHING) · large left-aligned "Shop EMPIRE" heading · subtitle text · below: featured **artist spotlight banner** — full-bleed illustrated cityscape bg (hip-hop album art aesthetic), centered bold white heading "RIO DA YUNG OG MERCH AVAILABLE NOW", carousel arrows

#### /shop/clothing — CATEGORY PAGE (most detail visible)
10. **Breadcrumb** — SHOP ALL / CLOTHING, small uppercase, above heading
11. **Category heading** — large left-aligned "Shop Clothing" bold Druk
12. **Filter pill row** — horizontal: `Headwear | Outerwear | Tops | Bottoms | Shorts | Hoodie` — outlined pill (inactive), filled black pill (active)
13. **Controls bar** — left: "Filters (0)" · right: "Sort by Relevance" dropdown + "494 product(s)" count
14. **Left sidebar filter** — "Filters (0)" heading · Pre-Order Only checkbox · On Sale Only checkbox · Price: Under $25 / $25–$50 / $50–$100 checkboxes
15. **Product grid** — 4 columns, generous gap · each card: gray bg, prominent black pill badge top-left, centered product photo, name + price below

#### /in-the-news — NEWS PAGE
16. **"IN THE NEWS"** — huge Druk heading uppercase, left-aligned
17. **3-column editorial card grid** — each card: full-bleed editorial photo · multiple badge chips stacked top-left · title below photo · 1-line excerpt · no "read more" link visible
18. **Badge chips on news cards** — pill shape, black filled, white text ("NEW ARTIST", "FEATURED", "INTERVIEW", "IMPACT", "COMMUNITY", "BUSINESS UPDATE")

#### PRODUCT DETAIL PAGE (PDP)
19. **Layout** — 2-col: large gray `#f5f5f5` bg image panel left (no carousel on this product) · info panel right
20. **Category tag above title** — small uppercase plain text above product name (e.g. "HIP HOP" — category/vendor, no styling, just text)
21. **Product title** — Test Söhne Kräftig, large ~40px
22. **Price** — plain, same weight as title, "$40.00"
23. **Description block** — "PRODUCT DESCRIPTION:" label bold caps, bullet list of features
24. **Size selector** — outlined rounded-corner pill buttons (Small / Medium / Large / X-Large / 2X-Large), active = filled/selected border
25. **Qty counter** — "-" [1] "+" with thin border, minimal
26. **CTA button** — full-width, "Select Size" (disabled state = light gray) → "Add to Cart" when size selected
27. **Policy accordion** — RETURNS / REFUNDS with "+" expand icon, thin border-bottom separator

#### store.empi.re — MERCH STORE
28. **Minimal nav** — hamburger left, search, EMPIRE logo center, login + cart right
29. **Hero slider** — full-bleed dark bokeh photo bg, product image float left, large italic bold serif heading right ("COLLECTION AGENCY / 5 YEAR ANNIVERSARY PRESSING / LIMITED RELEASE")
30. **Genre-nav** — Alternative / Afrobeats / Country / Electronic / Hip-Hop / Latin / Pop / R&B / Reggae / Soul / All Genres
31. **Format-nav** — VINYL / CDs / CASSETTES
32. **Artist section heading** — "Shaboozey" and other artists as named product rail sections
33. **"| 100% INDEPENDENT |"** marquee looping ticker

---

## KALEIDO (kaleidojewellery.com) — Full Audit

### Typography
| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero wordmark | GTStandard-M | massive | — (italic) | — |
| Hero/display | Outfit | 120px h1 | 600 | -1px |
| Section headings | Outfit | 48px h2 | 600 | -0.5px |
| Nav/category labels | Outfit | 14px | 500 | +0.1px |
| Body/UI | Geist | 13px | 400 | normal |
| Product labels/tags | Geist | 12px | 400 | normal |

### Color Palette
| Token | Value | Use |
|---|---|---|
| body-bg | `#ffffff` | Body |
| body-text | `rgb(31,31,31)` ≈ `#1f1f1f` | All text |
| announcement | `rgb(232,165,234)` = `#E8A5EA` | Top bar (lavender) |
| secondary-bar | `rgb(247,209,112)` = `#F7D170` | Second utility bar |
| card-bg | `rgb(249,248,244)` = `#F9F8F4` | Product cards (warm off-white) |
| sub-cat-circle | `rgb(238,238,238)` = `#EEEEEE` | Category circle bg |
| cta-btn | `rgb(31,31,31)` | "Add to Bag" button |
| discount-tag | `rgb(232,165,234)` = `#E8A5EA` | Lavender discount chip |
| swatch-gold | `rgb(211,175,55)` = `#D3AF37` | Gold color swatch |
| swatch-silver | `rgb(211,211,211)` = `#D3D3D3` | Silver color swatch |

### Component Inventory (ordered by page)

#### HOME PAGE
1. **Lavender announcement bar** — `#E8A5EA` bg, dark text, animated marquee: "FREE local delivery above $30! FREE shipping to Malaysia above $60! Now shipping internationally 🌍"
2. **Nav** — "Kaleido" wordmark text left · New In / Back in Stock / Bestsellers / Waterproof / Shop By (dropdown) / Earrings / Bracelets / Necklaces / Rings / SALE center · Search / Wishlist❤ / Account / Cart right
3. **Hero — split panel** — 2 scenes side-by-side, full-bleed, oversized italic brand wordmark "Kaleido" overlaid at ~50% opacity across the seam
4. **Category grid** — 6 equal columns, lifestyle product-on-model photography, white label text bottom-left of each tile
5. **Editorial promo panels** — full-bleed lifestyle photo bg, large centered heading + subtitle, full-width gold/black CTA button pinned to bottom ("Discover Bestsellers", "Shop All")
6. **OFFERS side tab** — rotated "OFFERS" text, vertical pill on right viewport edge, stays fixed on scroll

#### /collections/best-sellers — CATEGORY PAGE
7. **Category page header** — "Bestsellers" centered heading, Outfit 600, description text · sub-category **circular icon navigator**: 4 items (Bracelets / Earrings / Necklaces / Rings), 100×100px circles with `#EEEEEE` bg, border-radius 50%, product silhouette images inside
8. **Filter bar** — "All Filters" button (black bg, white text, filter icon, no border-radius) · "Category" outlined chip · right: "155 Products | Sort by: Best Selling" dropdown
9. **Product card** — bg `#F9F8F4` (warm off-white), border-radius 8px · **plain text label tags top-left (white bg `#fff`, 12px Geist/400): "Bestseller" / "Waterproof"** — no pill border/outline, just white rect behind text · product photo centered · swatch color dots (28×28px circles) below image · product name + price below
10. **Lavender discount chip** — `#E8A5EA` bg, black text, class "bg-violet", "0% off" / percentage off label

#### PRODUCT DETAIL PAGE (PDP)
11. **Full-width 2-col split image** — two product photos side by side with vertical center divider, cream background behind product
12. **Tag chips above image** — "Bestseller" and "Waterproof" as plain text positioned top-left
13. **Breadcrumb** — Home / Waterproof Bracelets / Product Name, small text, top-right
14. **Finishing Colour selector** — "Finishing Colour Silver" label + 28×28px circle swatches (silver/gold circles, 100% radius)
15. **Stone Size selector** — "Stone Size 3mm" label + outlined pill chips: 1.5mm / 2mm / **3mm** (selected = dark border, bold)
16. **Length selector** — "Length 5.5"" + outlined pill chips: **5.5"** / 6.25"
17. **CTA button** — full-width black `rgb(31,31,31)`, white text, **"Add to Bag — S$32.90"** (price inside CTA text!), border-radius 4px, padding 14px 56px, font 14px/500
18. **Wishlist icon** — heart icon right of CTA button
19. **STACK & SAVE upsell** — inline box: "2 items = 10% off / 3 items & above = 10% off + Free Birthstone Earring"
20. **Loyalty points row** — "✦ Worth 165 points — Earn 5 points for every $1 spent... Join for free"
21. **Product promise** — "🌿 Hypoallergenic jewellery, made for comfort."
22. **"You May Also Like"** — related products horizontal rail below fold
23. **"Recently Viewed"** — second products rail
24. **Customer Reviews** — powered by JDGM (Judge.me)

#### FOOTER (white bg)
25. **Newsletter** — "Unlock exclusive perks, new arrivals & styling tips straight to your inbox." + email input + Submit
26. **Social follow** — "Follow us" text link
27. **3-col link nav** — About (Our Story, Our Stores) · Community (Club Kaleido - Membership) · Support (FAQs, Shipping & Delivery, Piercing Studio, Size Guide, Care Guide, Contact Us)
28. **Copyright** — ©2026 Kaleido. All Rights Reserved. · Privacy Policy · Terms & Conditions

---

## Kira /shop Implementation Plan

### MUST BUILD (highest score impact)

| # | Component | Inspired By | Score Lever |
|---|---|---|---|
| 1 | **Colored announcement bar marquee** | Kaleido lavender bar | Visual Richness |
| 2 | **Marquee ticker "| Islandwide delivery · 30+ cities · Powered by Kira ✨ |"** | Empire / store.empi.re | Visual Richness |
| 3 | **HUGE section heading + pill CTA pattern** | Empire | Polish |
| 4 | **Category filter pill row** | Empire /clothing | Polish + Completeness |
| 5 | **Black filled pill badge on product cards ("CAKE", "FLOWERS", "HAMPER")** | Empire card badge | Visual Richness |
| 6 | **Circular sub-category navigator (100×100px circles)** | Kaleido Bestsellers | Visual Richness |
| 7 | **Full-bleed lifestyle photo category grid** | Kaleido homepage | Visual Richness |
| 8 | **Editorial 2-col feature panels** | Kaleido homepage | Polish |
| 9 | **"Add to Cart — LKR 1,200" price-in-CTA** | Kaleido PDP | Experience |
| 10 | **"Ask Kira" rotated side tab (OFFERS-style)** | Kaleido side tab | Creativity |

### NICE TO HAVE

| Component | Inspired By |
|---|---|
| Left sidebar filter (Pre-Order, Price range) | Empire category page |
| Artist spotlight / featured-product banner | Empire /shop hero |
| STACK & SAVE upsell row | Kaleido PDP |
| Color swatch dots on product cards | Kaleido card |
| Newsletter signup section | Kaleido footer |
| Genre/category sub-nav tabs | store.empi.re |

---

## Component Library Matches

### React Bits (reactbits.dev)
- **Marquee** → ticker strip and announcement bar
- **Infinite text** animations for headings
- **Split text** / staggered reveal for section headings

### 21st.dev
- **Bento grids** → editorial feature panels (2-col layouts)
- **Hero sections** with animated backgrounds
- **Product cards** with hover transitions

### Shadcnblocks
- **Feature sections** → editorial 2-col promo panels (directly matches Kaleido panels)
- **Category cards** → could be adapted for lifestyle photo grid
- **Pricing cards** → could be adapted for "bundle deals" display

### HyperUI (hyperui.dev)
- **Filter chips/tabs** → category filter pill row
- **Product cards with badge overlays** → matches Empire card badge pattern
- **Sidebar filters** → left filter panel

### Cult UI / Hero Color Panels
- **Hero gradient panels** → full-bleed category hero backgrounds
- **Color panel grids** → could adapt to category grid

### Watermelon UI
- **Product card** patterns → clean card with tag overlays

### Apple Cards Carousel (Aceternity)
- **Horizontal card carousel** → horizontal category scroll / featured products rail

### Animated Beam / Magic UI
- **Beam animations** → could use for "Powered by Kira" indicator in announcement bar

### Daisyui
- **Badge** component → card chip badges
- **Tabs** → filter chip tabs

---

## Key CSS/Token Values to Steal

```css
/* Empire badge chip (BLACK PILL on product card) */
.empire-badge {
  background: #000;
  color: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Kaleido plain text label (WHITE RECT tag) */
.kaleido-label {
  background: #fff;
  color: rgb(31,31,31);
  font-size: 12px;
  font-weight: 400;
  padding: 2px 6px;
}

/* Kaleido product card */
.kaleido-card {
  background: rgb(249,248,244); /* #F9F8F4 */
  border-radius: 8px;
}

/* Kaleido sub-category circle */
.kaleido-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #EEEEEE;
}

/* Kaleido "Add to Bag" CTA */
.kaleido-cta {
  background: rgb(31,31,31);
  color: #fff;
  border-radius: 4px;
  padding: 14px 56px;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
}

/* Kaleido discount tag (lavender) */
.kaleido-discount {
  background: rgb(232,165,234); /* #E8A5EA */
  color: rgb(31,31,31);
  font-size: 12px;
}

/* Empire section heading layout */
.empire-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.empire-section-header h2 {
  font-family: 'Druk Wide Web', 'Bebas Neue', sans-serif;
  font-size: clamp(2rem, 5vw, 4rem);
  text-transform: uppercase;
}
```

---

## Fonts — Free Equivalents

| Empire/Kaleido Font | Free Substitute | Source |
|---|---|---|
| Druk Wide Web Medium | Bebas Neue | Google Fonts |
| Druk Wide Web Medium | Anton SC | Google Fonts |
| Test Söhne Kräftig | DM Sans Bold | Google Fonts |
| GTStandard-M (italic) | Playfair Display Italic | Google Fonts |
| Outfit | Outfit | Google Fonts (same!) |
| Geist | Inter or Geist | Vercel/Google Fonts |

Kira currently uses: DM Serif (display) + Jakarta (body). **Recommendation: add Bebas Neue or Anton SC for section headings only**, keep DM Serif for Kira-identity elements (chat headers, logo wordmark).
