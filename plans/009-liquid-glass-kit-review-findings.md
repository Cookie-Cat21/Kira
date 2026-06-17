# 009 — Liquid Glass kit review findings

**Branch:** `liquid-glass-kit` (PR #68)  
**Reviewed at:** `cd50a5a` — `feat: Apple-fidelity Liquid Glass UI kit`  
**Scope:** `app/components/glass/*`, `app/liquid-glass/page.tsx`, `app/globals.css` (lg-* block), `plans/007-apple-liquid-glass-fidelity.md`  
**Method:** Read-only code review + `npm run build`. No kit fixes implemented in this pass.

Companion brief: [008-composer-glass-improvement-brief.md](008-composer-glass-improvement-brief.md)

---

## P0 — Bugs / Correctness

### 1. `GlassEffectContainer` goo filter distorts all child content

`app/components/glass/GlassEffectContainer.tsx:34-38`

**What's wrong:** `filter: url(#lg-goo)` is applied to the wrapper `div`, so the entire subtree — text, icons, SVG strokes — passes through `feGaussianBlur` + alpha threshold before `feComposite`. Content will look soft/blobby at edges, not crisp glass-over-content.

**Why it matters:** The component is exported and documented as the SwiftUI `GlassEffectContainer` analog, but as shipped it is not usable for real UI clusters. The gallery never mounts it, so this bug is invisible on `/liquid-glass`.

**Fix sketch:**
```tsx
// Two-layer structure: filtered blob shapes behind, crisp content on top
<div className={className} style={{ position: "relative" }}>
  <div aria-hidden style={{ position: "absolute", inset: 0, filter: merge ? "url(#lg-goo)" : undefined }}>
    {blobShapes} {/* solid glass silhouettes only */}
  </div>
  <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
</div>
```
Or require children to be positioned glass shells with content rendered in a sibling unfiltered layer.

---

### 2. `live` + default `interactive` fight over `--lg-px` / `--lg-py`

`app/components/glass/LiquidGlass.tsx:210-274` · `app/liquid-glass/page.tsx:200-211`

**What's wrong:** When `live={true}` (gallery enables this when refraction is On), scroll/tilt listeners write `--lg-py` / `--lg-px`. Pointer handlers still run (`interactive` defaults `true`) and overwrite the same vars on hover. The gleam jitters between scroll-driven and pointer-driven positions.

**Why it matters:** The hero/comparison cards are the surfaces meant to demo `live`; pointer tracking silently defeats it.

**Fix sketch:**
```tsx
// In LiquidGlass.tsx — auto-disable pointer tracking when live is on
const trackPointer = interactive && !live;
// use in handleMove/handleLeave guards
```

---

### 3. `deviceorientation` handler is not rAF-throttled

`app/components/glass/LiquidGlass.tsx:261-264`

**What's wrong:** `onTilt` calls `setProperty` synchronously on every orientation event. Scroll is rAF-throttled (`:252-259`); tilt is not.

**Why it matters:** Violates the kit's 60fps discipline. On devices that fire orientation events frequently, this causes main-thread churn.

**Fix sketch:**
```tsx
let tiltFrame = 0;
const onTilt = (ev: DeviceOrientationEvent) => {
  cancelAnimationFrame(tiltFrame);
  tiltFrame = requestAnimationFrame(() => {
    const g = Math.min(1, Math.max(0, ((ev.gamma ?? 0) + 45) / 90));
    el.style.setProperty("--lg-px", `${(g * 100).toFixed(1)}%`);
  });
};
// cancel tiltFrame in effect cleanup alongside frame
```

---

### 4. `GlassSearch` Escape-with-closed-panel fires `onSearch("")`

`app/components/glass/GlassSearch.tsx:97-104`

**What's wrong:** When the suggestions panel is closed, Escape calls `commit("")`, which invokes `onSearch?.("")` and blurs the input.

**Why it matters:** In storefront wiring (`plans/006`), `onSearch` will likely navigate or query. Escape should clear/close locally, not submit an empty search. Surprising for keyboard users.

**Fix sketch:**
```tsx
} else if (e.key === "Escape") {
  if (showPanel) { setOpen(false); setActive(-1); }
  else { setQuery(""); /* no onSearch */ }
}
```

---

### 5. `GlassSearch` suggestion clicks on touch — blur race

`app/components/glass/GlassSearch.tsx:137` · `:181`

**What's wrong:** `onMouseDown={(e) => e.preventDefault()}` prevents blur on mouse-driven clicks, but there is no `onTouchStart` or `onPointerDown` equivalent. On mobile, `blur` → 120ms timeout → panel unmount can win the race against `click`.

**Why it matters:** Storefront search is a primary surface; touch is first-class for mobile traffic.

**Fix sketch:**
```tsx
onPointerDown={(e) => e.preventDefault()} // covers mouse + touch
```

---

## P1 — Design Fidelity

### 6. Glass-on-glass in `GlassCard` footer demo

`app/liquid-glass/page.tsx:205-211` · `app/components/glass/GlassCard.tsx:65-69`

**What's wrong:** Footer nests `GlassButton variant="secondary"` (LiquidGlass) inside `GlassCard` (LiquidGlass).

**Why it matters:** Plan 007 rule: *"Never stack glass on glass (muddy, illegible)."* The demo teaches the wrong pattern for 006 migration.

**Fix sketch:** Footer CTAs should be `primary` (opaque) + `ghost` (hairline, no backdrop), or the card body should be opaque content with glass only on the outer chrome.

---

### 7. Fixed 120px specular gleam doesn't scale with surface size

`app/globals.css:408-411`

**What's wrong:** `.lg-shine::after` uses `120px 120px` radial regardless of component dimensions.

**Why it matters:** On capsules (`GlassChip`, ~30px tall) the highlight is wider than the control — reads as a sticker, not rim glass. On large cards it's a small dot. Apple scales the gleam to the control's geometry.

**Fix sketch:** Drive gleam size from a CSS var set by `LiquidGlass` based on `min(width, height)`, or use container queries:
```css
background: radial-gradient(
  calc(var(--lg-gleam, 0.45) * min(100%, 100cqh)) ...
  at var(--lg-px, 50%) var(--lg-py, 0%),
  ...
);
```

---

### 8. Clear variant legibility on bright media is marginal

`app/globals.css:352-363` · `app/liquid-glass/page.tsx:238-245`

**What's wrong:** Clear scrim peaks at `rgba(0,0,0,0.28)` and falls to `0.04`. On the gallery's vivid gradient, "More glass" body copy (`text-white/55`) washes out compared to Regular.

**Why it matters:** Apple pairs Clear with a stronger dimming layer; Clear is only usable over controlled media.

**Fix sketch:** Bump scrim to ~`0.38–0.45` at center, or add stronger foreground opacity for Clear-only content.

---

### 9. `concentric()` exported but unused — dock inner radius is off

`app/components/glass/GlassEffectContainer.tsx:10-11` · `app/components/glass/GlassDock.tsx:25` · `:35`

**What's wrong:** Dock shell `radius={18}` with `p-1.5` (6px) should yield inner radius 12 (`concentric(18, 6)`). Items use `rounded-[13px]`. Helper is exported from `index.ts` but never used in any component.

**Why it matters:** Apple's concentricity rule is visible on nav clusters; 1px mismatch reads as slightly "off" at the dock lip.

**Fix sketch:**
```tsx
style={{ borderRadius: concentric(18, 6) }} // → 12px
```

`GlassSearch` suggestion rows (`rounded-xl` = 12 inside `radius={18}` panel with `p-1.5`) are correct — use as reference.

---

### 10. `GlassSegmented` / `GlassSwitch` sit outside the material system

`app/components/glass/GlassSegmented.tsx:36-39` · `app/components/glass/GlassSwitch.tsx:26-37`

**What's wrong:** Both use flat `rgba()` fills, not `LiquidGlass`. Segmented sits inside a `GlassCard` in the gallery header — frosted card + flat control reads as two systems.

**Why it matters:** Gallery is meant to sell *one* material. These are the controls most compared to iOS 26 screenshots.

**Fix sketch:** Wrap segmented track in a thin `LiquidGlass` shell (`blur={6}`, `interactive={false}`), or document these as intentionally lightweight. Switch track could be a `LiquidGlass` capsule with opaque knob.

---

### 11. Pointer gleam ignores `prefers-reduced-motion`

`app/components/glass/LiquidGlass.tsx:210-227` · `app/globals.css:473-484`

**What's wrong:** `live` bails on reduced motion (`:249`), but `handleMove` still tracks pointer and updates `--lg-px/py`. CSS kills transitions on `.lg-shine::after`, but the gleam still follows the cursor.

**Why it matters:** Plan 007: *"Reduce Motion → no moving specular."* Apple freezes the highlight.

**Fix sketch:** Early-return in `handleMove` / `handleLeave` when `matchMedia("(prefers-reduced-motion: reduce)").matches`.

---

### 12. `.lg-edge` doubles backdrop-filter cost on every surface

`app/globals.css:329-347` · gallery ~14 `LiquidGlass` instances

**What's wrong:** Each surface runs two `backdrop-filter` passes (`.lg-effect` + `.lg-edge`). Gallery ≈ 28 compositor layers. Plan 006 flags this as the perf risk for product grids.

**Why it matters:** Storefront nav + dock + search is fine; a grid of glass cards is not.

**Fix sketch:** Gate `.lg-edge` behind a prop defaulting `true` on hero/nav only, or replace with pure CSS `box-shadow` rim on small controls (no second backdrop pass).

---

### 13. Gallery staging: glass used as content background

`app/liquid-glass/page.tsx:197-216`

**What's wrong:** The "Card" specimen presents `GlassCard` as a content panel ("Birthday Hamper / Colombo"), not as floating chrome over opaque content.

**Why it matters:** Correct for a component catalog, but 006 Phase 5 warns against glass product cards. The page should visually separate *chrome specimens* from *content you must not glassify*.

**Fix sketch:** Add a callout: "Glass = controls layer" with opaque content card vs glass toolbar floating above it.

---

## P2 — Polish / Maintainability

### 14. `LiquidGlassProps` always extends button props

`app/components/glass/LiquidGlass.tsx:178-179`

**What's wrong:** `Omit<ComponentPropsWithoutRef<"button">, ...>` even when `as="div"`. Allows `type="button"` on a `div`, and blocks valid div attrs in strict mode.

**Fix sketch:** Discriminated union on `as`, or generic `LiquidGlassProps<T extends ElementType>`.

---

### 15. Pointer handler rAF not cancelled on unmount

`app/components/glass/LiquidGlass.tsx:206` · `:219-224`

**What's wrong:** `raf.current` from `handleMove` is never cancelled in a cleanup effect. Low severity (only touches detached DOM), but sloppy.

**Fix sketch:**
```tsx
useEffect(() => () => cancelAnimationFrame(raf.current), []);
```

---

### 16. `interactive={false}` still attaches pointer listeners

`app/components/glass/LiquidGlass.tsx:280-281`

**What's wrong:** `onPointerMove` / `onPointerLeave` always wired; handlers early-return when `!interactive`.

**Fix sketch:** Conditionally spread handlers only when `interactive || onPointerMove || onPointerLeave`.

---

### 17. `GlassSearch` combobox ARIA incomplete

`app/components/glass/GlassSearch.tsx:121-127`

**What's wrong:** Missing `aria-haspopup="listbox"`. `role="combobox"` without it fails some screen-reader heuristics.

**Fix sketch:** Add `aria-haspopup="listbox"` on the input.

---

### 18. `GlassSegmented` uses `role="tablist"` without panels

`app/components/glass/GlassSegmented.tsx:37`

**What's wrong:** No associated `tabpanel` elements. A `radiogroup` pattern fits better for a value picker without panels.

**Fix sketch:** `role="radiogroup"` on container, `role="radio"` + `aria-checked` on buttons.

---

### 19. Dark-theme-only ink colors block light mode

`app/globals.css:301-415` · all `Glass*.tsx` (`text-white/*`)

**What's wrong:** All foreground, rim, and tint tokens assume white-on-dark `#09080f`.

**Why it matters:** Storefront may need light sections; no `--lg-ink` / `--lg-rim` hook exists yet.

**Fix sketch:** Introduce CSS vars on `.lg-wrapper` (`--lg-ink`, `--lg-ink-muted`, `--lg-rim-hi`, `--lg-rim-lo`) defaulting to current values.

---

### 20. `GlassEffectContainer` + `concentric` not demonstrated

`app/liquid-glass/page.tsx` (absent)

**What's wrong:** Exported primitives with no gallery specimen. Goo merge cannot be evaluated; `concentric()` has no living example.

**Fix sketch:** Add a "Morph / merge" section: two `LiquidGlass` blobs in `GlassEffectContainer` with Framer `layoutId` animation.

---

### 21. Proposed tests (Playwright)

Repo has `@playwright/test` (`tests/e2e/kira.spec.ts`, `playwright.config.ts`). Suggest `tests/e2e/liquid-glass.spec.ts`:

| # | Test | Asserts |
|---|------|---------|
| 1 | **GlassSearch keyboard** | Type → ArrowDown → Enter selects suggestion; `aria-activedescendant` updates; input value matches |
| 2 | **GlassSearch Escape** | Open panel → Escape closes without side-effect; closed panel → Escape clears value, does *not* call stub `onSearch` |
| 3 | **GlassSaveButton toggle a11y** | `aria-pressed` flips; `aria-label` is "Save"/"Saved"; burst absent under `prefers-reduced-motion` |
| 4 | **GlassSwitch** | Click toggles `aria-checked`; keyboard Space toggles |
| 5 | **Material a11y fallbacks** | Emulate `prefers-reduced-transparency: reduce` → `.lg-effect` has no backdrop-filter; wrapper has opaque background |

Run: `npx playwright test tests/e2e/liquid-glass.spec.ts` (no Groq dependency).

---

## Checked — No Issue

| Item | Verdict |
|------|---------|
| Inline `backdrop-filter` in JSX (Lightning CSS `var()` gotcha) | Correct — dynamic frost stays inline (`LiquidGlass.tsx:293-296`); static `.lg-edge` in CSS |
| `.lg-content` in `@layer components` | Correct — utilities can override `display` (`globals.css:419-425`) |
| `prefers-reduced-transparency` / `prefers-contrast` blocks | Present and load-bearing (`globals.css:489-521`) |
| `displace` browser limitation (Firefox vs Chromium) | Documented (`LiquidGlass.tsx:44-46`); not a bug |
| `BEVEL_MAP` `feImage` data-URI technique | Replaces fractal noise per plan 007. **Safari:** not verified in review environment — spot-check on iOS Safari before storefront ship |
| `GlassSearch` mousedown `preventDefault` on suggestions | Correct for mouse (`GlassSearch.tsx:181`); touch gap noted in P0 #5 |
| `GlassSaveButton` `AnimatePresence mode="popLayout"` | `minWidth: 4.2ch` on label grid mitigates width jump (`GlassSaveButton.tsx:137`) |
| `GlassSaveButton` burst spans | Keyed replay works; `pointer-events-none` correct (`GlassSaveButton.tsx:105-133`) |
| `npm run build` / TypeScript | Passes at review time |
| Primary `GlassButton` = opaque white CTA | Matches Apple "tint sparingly" rule (`GlassButton.tsx:45-57`) |
| `LiquidGlassFilters` mounted once on gallery page | Correct pattern for `displace` / goo (`page.tsx:56`) |
| `live` effect scroll listener | rAF-throttled + passive; cleanup cancels frame (`LiquidGlass.tsx:252-272`) |
| Chip / Field / Search `interactive={false}` | Correct — inputs shouldn't steal gleam from parent |

---

## Priority summary

| Priority | Count | Top action |
|----------|-------|------------|
| **P0** | 5 | Fix `GlassEffectContainer` architecture; resolve `live`/`interactive` conflict; throttle tilt; fix Search Escape + touch |
| **P1** | 8 | Remove glass-on-glass demo; scale gleam; tighten Clear scrim; apply `concentric()`; reduced-motion freeze; perf-gate `.lg-edge` |
| **P2** | 8 | Prop typing; listener cleanup; ARIA polish; CSS ink vars; gallery specimens; Playwright suite |

**No code fixes were implemented in the review pass.** See [LIQUID-GLASS-REVIEW-VERIFICATION.md](../LIQUID-GLASS-REVIEW-VERIFICATION.md) for publish/verify notes.
