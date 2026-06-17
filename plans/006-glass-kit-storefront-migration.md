# 006 — Liquid Glass kit → storefront migration

**Goal:** Move every storefront surface off the old single-layer glass CSS
(`.liquid-glass-nav`, `.glass-chip`, `.glass-input`, `.glass-card`, `.store-card`)
onto the layered `LiquidGlass` component kit (`app/components/glass/`, gallery at
`/liquid-glass`), apply a Kapruka brand pass, and converge on **one** glass system.

## Why

The redesign already reads "dark glass," but the material is flat: a blur + border
+ shadow. The new kit gives the Apple/visionOS material — frost + tint + a hairline
specular rim + a pointer-tracked highlight + optional refraction — and ships
accessible primitives (`GlassSearch` combobox, `GlassSegmented`, `GlassSwitch`).
Adopting it lifts the redesign from "dark theme" to "designed material," and kills
the duplicate styling system.

## Old → new mapping

| Old (CSS class)                     | Surface                          | New (kit)                                  |
|-------------------------------------|----------------------------------|--------------------------------------------|
| `.liquid-glass-nav`                 | StoreNav bar + search panel      | `LiquidGlass` (radius 0/bottom, blur 16)   |
| `.glass-chip` (icon buttons)        | search/cart toggles              | **`GlassIconButton`** (new — see Phase 0)  |
| `.glass-input`                      | nav search field                 | `GlassSearch` (wired to `/api/store/search`)|
| `.glass-chip` (eyebrow/quick reply) | hero eyebrow, quick replies      | `GlassChip`                                |
| `.glass-card` (CTA / panels)        | "Ask Kira" CTA, detail panels    | `GlassButton` / `GlassCard`                |
| `.store-card`                       | product cards (grids + rails)    | `GlassCard` lite (see Phase 5 perf note)   |
| custom dock markup                  | `KiraDock` launcher              | `GlassDock`                                |
| `.glass-rail`                       | rail/section chrome              | keep (cheap) or thin `LiquidGlass`         |

## Cross-cutting decisions (lock these first)

1. **Mount the filter once.** `<LiquidGlassFilters />` must exist once on any page
   using `displace`. Add to the store layout (and `/` if used there), not per-card.
2. **Performance budget — the real risk.** The layered material runs a
   `backdrop-filter` per instance (+ an SVG displacement filter when `displace`).
   A grid of 20–30 product cards each with 4 layers + backdrop-filter will jank,
   especially on mobile. Rules:
   - `displace` ONLY on 1–2 hero/feature surfaces, never on repeated elements.
   - Product cards: `interactive={false}`, `displace={false}`, modest `blur`
     (6–8). Measure FPS on a full grid before committing; if it stutters, keep a
     lightweight non-backdrop card and reserve true glass for the detail/hero.
   - One `requestAnimationFrame` highlight is per-component and hover-gated — fine
     for nav/hero/cart, avoid lighting 30 cards at once.
3. **Brand pass.** The kit is near-monochrome white-on-dark; Kapruka is
   purple `#402970` + yellow `#f8da08`. Thread brand in via the `tint` prop on
   feature surfaces and keep `GlassButton variant="primary"` for brand CTAs
   (yellow/white), not glass. Don't tint everything — keep the material neutral.
4. **Known build gotchas (already hit):**
   - Lightning CSS strips `backdrop-filter` whose value contains a `var()` — the
     kit applies the live filter INLINE for this reason; keep it that way.
   - Tailwind v4 un-layered CSS beats `@layer utilities`; component base rules
     (e.g. `.lg-content`) live in `@layer components` so utilities win. Don't
     reintroduce un-layered display rules.
5. **A11y:** preserve focus-visible rings on every interactive glass surface;
   the kit honors `prefers-reduced-motion`. Audit white/40 text contrast on glass
   (some secondary text may need bumping to white/55–60 for WCAG AA).

## Kit gaps to fill (small additions)

- **`GlassIconButton`** — icon-only round glass button (nav search/cart, qty
  steppers). GlassButton `size="sm"` is text-shaped; add a square/round variant.
- **`GlassBadge`** — for "Low stock" / price / "20% off" pills on cards.
- **`GlassDrawer` / `GlassModal`** — cart drawer + product QuickView surfaces
  (currently bespoke). Optional but unifies the system.

## Phases (ship one PR per phase, verify in `/liquid-glass` style + live route)

### Phase 0 — Foundations
- Add `<LiquidGlassFilters />` to store layout.
- Add `GlassIconButton` (+ `GlassBadge`) to the kit, export from `index.ts`,
  add specimens to the `/liquid-glass` gallery.
- Add brand `tint` recipe + confirm `GlassButton primary` = brand CTA.

### Phase 1 — StoreNav (`app/components/store/StoreNav.tsx`)
Highest visibility, lowest instance count → best first win.
- Nav surface → `LiquidGlass` (or keep `.liquid-glass-nav` if cheaper and visually
  matched — nav is sticky/always-on, so a single cheap surface is acceptable).
- Search/cart toggles → `GlassIconButton`; cart count → `GlassBadge`.
- Search panel → `GlassSearch`, `suggestions` fed by `/api/store/search` debounced
  results; selecting routes to `/product/[id]`.

### Phase 2 — StoreHero (`app/components/store/StoreHero.tsx`)
- Eyebrow → `GlassChip`; "Ask Kira" CTA → `GlassButton variant="secondary"`;
  "Start shopping" stays solid white CTA. Hero tiles can take `displace` (1 surface).

### Phase 3 — Product detail (`app/components/store/ProductDetailClient.tsx`)
- Info/delivery panels → `GlassCard`; add-to-cart/qty → `GlassButton` /
  `GlassIconButton`; any city/date pickers → `GlassSegmented` / `GlassField`.

### Phase 4 — Cart drawer + checkout (CartContext / KiraExperience)
- Drawer shell → `GlassDrawer` (or `LiquidGlass`); line-item steppers →
  `GlassIconButton`; checkout summary → `GlassCard`.

### Phase 5 — Product cards + rails (`StoreProductCard`, `ShopGrid`, `ProductRail`, `CategoryRail`)
Highest count, perf-sensitive → **do last, measure first.**
- Convert `.store-card` to `GlassCard` lite per the perf rules; keep the
  translateY hover lift. Stock/price → `GlassBadge`.
- If a full grid janks, fall back to a non-backdrop card and document the call.

### Phase 6 — Cleanup & QA
- Remove now-dead old glass classes from `globals.css` (`.glass-card`,
  `.glass-chip`, `.glass-input`, variants) once no references remain — grep first.
- Decide fate of `/liquid-glass` (keep as internal style reference vs. remove pre-ship).
- Cross-breakpoint visual QA (mobile backdrop-filter perf), `npm run build` +
  `npm run lint`, screenshot before/after each surface.

## Sequencing rationale

Nav → Hero → Detail → Cart → Cards = ascending instance count / perf risk, and
descending "wow per hour." Each phase is independently shippable and visually
verifiable, so the redesign never regresses mid-migration.
