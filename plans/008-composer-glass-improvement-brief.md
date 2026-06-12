# 008 — Brief for Composer: find improvements in the Liquid Glass kit

> Paste this whole file as the task prompt. It is self-contained.

## Mission

You are reviewing a **Liquid Glass design system** (an Apple visionOS/iOS-26
"Liquid Glass" material recreated for the web) for **design fidelity** and
**implementation quality**. Your job is to FIND and PROPOSE improvements —
prioritized, concrete, patch-sized — not to rewrite the kit.

Work on branch `liquid-glass-kit` (PR #68, additive-only on top of `main`).

## The codebase

Next.js 16 (Turbopack) · React 19 · Tailwind v4 · framer-motion 12 · TypeScript.

The kit surface (the ONLY files in scope):

| Path | What it is |
|---|---|
| `app/components/glass/LiquidGlass.tsx` | Core primitive. Layered spans: `.lg-effect` (backdrop frost + optional SVG refraction), `.lg-edge` (rim magnification), `.lg-tint`, `.lg-scrim` (clear variant), `.lg-shine` (bevel + chromatic fringe + pointer gleam), `.lg-content`. Also exports `LiquidGlassFilters` (SVG `#lg-distortion` edge-lensing with per-channel chromatic dispersion, `#lg-goo` metaball). |
| `app/components/glass/Glass*.tsx` | Button, Card, Chip, Dock, Field, Search, SaveButton, Segmented, Switch, EffectContainer (+ `concentric()` helper) |
| `app/components/glass/icons.tsx` | thin-line 1.5px stroke icon set |
| `app/components/glass/index.ts` | barrel |
| `app/liquid-glass/page.tsx` | gallery/showcase page |
| `app/globals.css` | the `lg-*` material layers (search "Apple Liquid Glass material") + a11y media queries at the bottom |
| `plans/007-apple-liquid-glass-fidelity.md` | the design rationale: Apple property → web technique mapping. **Read first.** |
| `plans/006-glass-kit-storefront-migration.md` | where the kit will be adopted next |

Verify with: `npm run dev` → `http://localhost:3000/liquid-glass`, and
`npx tsc --noEmit`. There are no kit tests (finding: suggest some).

## Non-negotiable constraints (violating these = invalid finding)

1. **Lightning CSS gotcha:** Tailwind v4's bundler STRIPS `backdrop-filter`
   whose value contains `var()`. Dynamic backdrop-filter values must stay
   INLINE in JSX (as they are in `LiquidGlass.tsx`). Static values may live
   in CSS. Do not "clean up" inline backdrop-filters into classes.
2. **Cascade layers:** plain (unlayered) CSS beats Tailwind utilities. Rules
   that components must be able to override with utility classes belong in
   `@layer components` (see `.lg-content`'s comment).
3. **Accessibility is load-bearing:** `prefers-reduced-motion`,
   `prefers-reduced-transparency`, `prefers-contrast` are all handled in
   `globals.css`; every interactive component keeps keyboard focus +
   `focus-visible` rings + accessible names. Any new/changed effect must keep
   all of this true.
4. **60fps discipline:** animate only `transform` / `opacity` / CSS custom
   props; pointer-move work stays rAF-throttled; no layout thrash; no new
   per-frame JS on scroll without rAF + passive listeners.
5. **Browser reality:** the SVG displacement refraction fully refracts the live
   backdrop only in Firefox; Chromium/Safari keep the frost with a faint bend.
   That's accepted and documented — `displace` stays opt-in. Don't "fix" it.
6. **Apple's design rules** (from plan 007): glass is the floating
   control/navigation layer above opaque content; never glass-on-glass; never
   glass as a content background; capsules + concentric nested radii; tint
   only for meaning, sparingly.
7. **API stability:** PR #68 is open. Keep component APIs stable unless you
   have a strong, stated reason; prefer additive props over breaking changes.
8. If you touch the gallery page, heed `AGENTS.md`: this Next.js version may
   differ from your training data — check `node_modules/next/dist/docs/` first.

## Where to probe (suspicions, not conclusions — verify before reporting)

**Implementation:**
- `LiquidGlass.tsx`: rAF id never cancelled on unmount; `rest` props typed as
  button props even when `as="div"`; pointer-event casts; `live` listeners'
  interaction with the pointer handlers (both write `--lg-px/--lg-py`).
- `GlassEffectContainer`: `filter: url(#lg-goo)` applies to the ENTIRE subtree
  — does it distort child text/icons? Is it usable as shipped, or does it need
  a structure (filtered blob layer behind unfiltered content)?
- `GlassSearch.tsx`: the 120ms blur timeout vs. suggestion clicks (race?),
  `aria-activedescendant` combobox correctness, controlled/uncontrolled
  drift, Escape-with-empty-query committing `""` via `onSearch`.
- `GlassSaveButton.tsx`: `AnimatePresence mode="popLayout"` inside an inline
  button — layout shift when the label width changes? burst spans leak?
- `.lg-edge` adds a SECOND backdrop-filter per surface (16+ on the gallery) —
  measure whether it's a real cost; propose a cheaper rim if so.
- `BEVEL_MAP` `feImage` data-URI: Safari has historic `feImage` quirks —
  check it doesn't break the whole filter chain there.
- Dark-theme-only: every color is hard-coded white-on-dark. Is a light-mode
  story feasible without a rewrite (CSS vars for the ink color)?
- No tests: propose the 3–5 highest-value ones (a11y attributes, toggle
  state, search keyboard nav) using the repo's existing test approach
  (`scripts/run-tests.mjs` style — read it before proposing).

**Design fidelity (compare against real Apple Liquid Glass, iOS 26 /
visionOS screenshots):**
- The specular gleam is a fixed 120px radial regardless of surface size —
  should it scale with the component?
- Rim bevel brightness, chromatic fringe alpha (currently ~0.10), edge-ring
  width (fixed 6px), shadow stack depth — too strong/weak anywhere?
- Clear-variant scrim curve: is "More glass" legible over bright media?
- Capsule/radius consistency across Segmented, Chip, Dock, Field, Search —
  and `concentric()` exists but is barely used; where should it be applied?
- Gallery staging: does the showcase sell the material (backdrop, spacing,
  section order)? Anything that reads "AI-generated demo page"?

## Deliverable

A single markdown report, findings ordered by priority:

- **P0 — bugs/correctness** (broken behavior, a11y regressions, leaks)
- **P1 — design fidelity** (visibly off from Apple's material)
- **P2 — polish/maintainability** (DX, naming, tests, docs)

Each finding: `file:line` · what's wrong · why it matters · a concrete fix
sketch (diff-sized, not an essay). If you verified something is actually fine,
say so in a short "checked, no issue" list — that has value too.

Do NOT implement fixes in the same pass unless asked; the report comes first.
