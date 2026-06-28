# 007 — Doing it like Apple: Liquid Glass fidelity spec

Companion to [006](006-glass-kit-storefront-migration.md). 006 says *where* to put
glass; this says *how to make the material itself behave like Apple's*, mapping
each Apple property to a concrete web technique and to our current kit's gaps.

Sources: Apple Newsroom (WWDC25 announcement, quoted), Apple HIG "Materials",
WWDC25 "Meet/Adopting Liquid Glass", and the SwiftUI `glassEffect` API.

## 1. Apple's model — the principles that actually matter

**Liquid Glass is a LAYER, not a fill.** Apple: controls are *"crafted out of
Liquid Glass and act as a distinct functional layer that sits above apps."* It's
the **navigation/control layer** — bars, buttons, sidebars, sheets, tab bars —
floating over an **opaque content layer** that scrolls beneath. The two hard
rules that follow:
- Never put glass on content backgrounds or full screens.
- Never stack glass on glass (muddy, illegible).

**Optical behaviour** (what makes it read as *glass*, not *frost*):
- *"This translucent material reflects and refracts its surroundings."* — true
  **edge lensing**: the background bends/magnifies at the curved rim, flatter in
  the center. A plain blur does NOT do this; this is the #1 differentiator.
- *"uses real-time rendering and dynamically reacts to movement with specular
  highlights."* — a live **specular gleam** on the rim that moves with
  motion/tilt/scroll.
- *"Its color is informed by surrounding content and intelligently adapts between
  light and dark environments."* — **adaptive tint + legibility**; the material
  re-colors itself from what's behind so foreground labels stay readable.
- Soft **shadow** beneath grounds the floating layer.

**Motion / "Liquid"** — *"dynamically transforming"*, controls *"dynamically
morph"*, tab bars *"fluidly expand and shrink"*. Glass **stretches and merges**
between states rather than cross-fading. In SwiftUI this is `GlassEffectContainer`
(shared glass space, blobs merge) + `glassEffectID` (morph transitions).

**Two variants:**
- **Regular** — default, max adaptivity, more frost; safe over any background.
- **Clear** — more transparent, more vivid refraction, less legibility safety;
  only over dim/controlled media, usually with a dimming scrim.

**Shape:** capsules / generous rounded-rects, with **concentricity** — nested
corners share a center (inner radius = outer radius − padding).

**Tint:** allowed for *meaning* (a prominent primary action), used **sparingly**;
never as decoration over large areas.

**Accessibility (system does this automatically; we must replicate):**
- Reduce Transparency → becomes opaque/frosted solid.
- Increase Contrast → stronger borders, less translucency.
- Reduce Motion → no morph, no moving specular.

**SwiftUI API (the shape of "how Apple lets you do it"):**
`.glassEffect(.regular, in: .rect(cornerRadius:))`, `.regular.tint(_)`,
`.regular.interactive()`, `GlassEffectContainer { … }`, `.buttonStyle(.glass)`.

## 2. Our kit vs Apple — gap analysis

| Apple property            | Our `LiquidGlass` today                         | Gap |
|---------------------------|-------------------------------------------------|-----|
| Edge lensing / refraction | `feTurbulence`+`feDisplacementMap` (random wobble), opt-in `displace` | ⚠️ wobble ≠ clean edge magnification |
| Specular rim              | static top-bright inset + pointer radial gleam  | ◐ no scroll/tilt motion |
| Adaptive color            | static `--lg-tint` gradient                     | ✗ not content-aware |
| Frost / translucency      | `backdrop-filter: blur saturate brightness`     | ✓ |
| Shadow                    | contact line + soft drop                         | ✓ |
| Press / interactive       | `.lg-press` scale + pointer highlight            | ◐ no fluid bounce |
| Regular vs Clear          | single material                                  | ✗ |
| Morph / merge container   | none                                             | ✗ |
| Concentric radius         | manual per-call                                  | ✗ |
| Reduce Motion             | handled                                          | ✓ |
| Reduce Transparency / Contrast | not handled                                 | ✗ |
| Capsule default           | per-component (Search ✓, others mixed)           | ◐ |

## 3. Technique map — closing each gap on the web

1. **True edge lensing (biggest win).** Replace the fractal-noise displacement
   map with a **purpose-built rounded-rect "bevel normal map"**: an inline SVG
   where the Red channel ramps L→R and Green ramps T→B *only near the borders*
   (transparent/flat center). Feed it via `feImage` → `feDisplacementMap
   in="SourceGraphic" in2="map" scale≈40`. Backdrop then bends/magnifies at the
   rim, flat in the middle — the real lens look. Keep it opt-in (cost) on
   hero/nav; add a cheap fallback everywhere: an inner edge-ring pseudo-element
   with its own `backdrop-filter: blur() brightness(1.15)` + `scale(1.04)` clipped
   to the rim for "edge magnification" without SVG.
   *Browser caveat (already in our code comments): Firefox refracts the live
   backdrop fully; Chromium/Safari keep the frost with a fainter bend.*

2. **Live specular.** Keep the pointer gleam; add optional `scroll`/
   `DeviceOrientation` hooks that nudge `--lg-px/--lg-py` so the highlight drifts
   with motion like Apple's. Sharpen the rim into a 1px bright inner + 1px dark
   outer bevel stroke, brightest top-left.

3. **Variants.** Add `variant: "regular" | "clear"`. Regular = blur 12–16,
   brightness 1.05, tint α ~0.05. Clear = blur 2–4, higher transparency, stronger
   displacement, and auto-apply a `--lg-scrim` behind content for legibility.

4. **Adaptive color (approximation).** True per-pixel sampling is JS-only
   (expensive) — reserve for one hero surface if ever. Default approximation:
   tuned `backdrop-filter: saturate(180%) contrast(1.05) brightness()` + a
   luminance scrim token so text stays legible over bright/busy backdrops.

5. **Morph / merge (`GlassEffectContainer` analog).** For dock / tab bar / menus:
   a wrapper that applies the **gooey metaball filter** (`filter: blur(8px)
   contrast(20)` over solid child shapes) so adjacent glass blobs merge, plus
   Framer Motion `layoutId` to stretch/morph between states (open ↔ closed).

6. **Concentricity.** Add `concentric(outer, pad) = outer - pad` helper; default
   buttons/chips/search to **capsule**. Nest cards with concentric inner radii.

7. **Accessibility media queries** in `globals.css`:
   - `@media (prefers-reduced-transparency: reduce)` → `.lg-effect{backdrop-filter:none}`,
     opaque `.lg-wrapper` background.
   - `@media (prefers-contrast: more)` → add visible border, drop blur.
   (Reduce-motion already covered — extend it to freeze the live specular.)

8. **Layer discipline = the perf answer.** Apple says glass is the functional
   layer over opaque content. That directly resolves 006's product-card worry:
   **don't glassify cards/content** — glassify nav, dock, hero CTAs, search,
   sheets, toolbars, media badges. Fewer, higher-fidelity glass surfaces beats
   many cheap ones, and matches Apple exactly.

## 4. Build order (highest fidelity-per-hour first)

1. Edge-lensing refraction (new bevel displacement map + cheap edge-ring) — the
   single change that makes it read as Apple glass.
2. `variant` regular/clear + capsule defaults + concentricity helper.
3. Accessibility media queries (reduce-transparency / increase-contrast).
4. Live specular (scroll/tilt) — polish.
5. Morph/merge container — for the dock/tab bar, when 006 Phase 1/4 needs it.

Each lands in the kit, is shown in `/liquid-glass`, then flows into 006's surface
migration.
