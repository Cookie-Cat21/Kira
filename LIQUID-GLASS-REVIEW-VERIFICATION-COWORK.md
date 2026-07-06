# Liquid Glass kit — review verification · 2026-06-12

Branch `liquid-glass-kit` · PR #68 · verify-only pass, no fixes implemented.

## 1. Repo state

| Check | Result |
|---|---|
| Branch / HEAD | `liquid-glass-kit` @ `cd50a5a` — feat: Apple-fidelity Liquid Glass UI kit |
| vs origin | Identical to `origin/liquid-glass-kit` (0 ahead / 0 behind); remote ref was last set **by push from this machine**, so GitHub has `cd50a5a` |
| Commits after review | **None** — no review/fix commits exist |
| Working tree | **Content-clean.** 83 files show "modified" but it is 100% CRLF/LF line-ending noise: `git diff -w --ignore-cr-at-eol` is empty, and insertions == deletions (26,228 each) |
| Untracked (local-only) | `plans/008-composer-glass-improvement-brief.md` (the review brief), `.agents/`, `.claude/skills/`, `.claude/worktrees/`, `skills-lock.json` |
| Caveat | `git fetch` couldn't run from the sandbox (private repo, no GitHub credentials there). Verified against the last-pushed ref + reflog. If someone pushed from elsewhere after the review, it wouldn't be visible — run `git fetch` on your machine to be 100% sure |

## 2. Build / dev

Ran on a sandbox-side copy so your Windows `node_modules` stayed untouched.

| Step | Result |
|---|---|
| `npm install` | ✅ |
| `tsc --noEmit` (the type-check `npm run build` runs) | ✅ clean |
| Tailwind v4 compile of `app/globals.css` | ✅ clean |
| `eslint app/components/glass app/liquid-glass` | ✅ clean |
| Full `next build` / `next dev` + gallery | ⚠️ **Environment-blocked, not a repo failure**: Turbopack's PostCSS child-process spawn is blocked in the sandbox; the `--webpack` fallback SIGBUSes on the native SWC binding; Google Fonts fetch is also blocked. Kit files are byte-identical to `cd50a5a`, where `npm run build` was previously verified passing on your machine |

## 3. Findings

### P0 — bugs/correctness

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | GlassEffectContainer goo filter distorts subtree; unused in gallery | ✅ confirmed | `GlassEffectContainer.tsx:34–39` puts `filter: url(#lg-goo)` on the div wrapping children; `#lg-goo` = blur(7)+alpha-contrast (`LiquidGlass.tsx:127–136`). Not imported by `app/liquid-glass/page.tsx:4–22` |
| 2 | `live` + default `interactive` both write `--lg-px/--lg-py` | ✅ confirmed | Pointer writes both at `LiquidGlass.tsx:221–223`; live scroll writes `--lg-py` at `:257`, tilt writes `--lg-px` at `:263`; `interactive` defaults true `:197`. Exercised in gallery — `page.tsx:200–201` (`displace/live={refract}`) |
| 3 | `deviceorientation` not rAF-throttled | ✅ confirmed | `onTilt` writes style directly `LiquidGlass.tsx:261–264` (listener `:268`); `onScroll` is rAF-throttled `:252–260` |
| 4 | Escape with closed panel calls `onSearch("")` | ✅ confirmed | `GlassSearch.tsx:97–103` — else-branch `commit("")` at `:102` → `onSearch?.("")` at `:80`, also blurs `:83` |
| 5 | `onMouseDown` preventDefault only; no touch/pointer equivalent | ✅ confirmed | `GlassSearch.tsx:181` (suggestions) and `:146` (clear button); blur-close races the 120 ms timeout at `:137` |

### P1 — design fidelity

| # | Finding | Status | Evidence |
|---|---|---|---|
| 6 | Glass-on-glass in gallery card footer (secondary GlassButton in GlassCard) | ❌ **not reproduced** | Footer uses `primary` + `ghost` (`page.tsx:207–210`) — solid white (`GlassButton.tsx:45–57`) and hairline outline (`:60–73`); neither renders glass. Only `secondary` is LiquidGlass (`:75–88`) and none appears inside a GlassCard in the gallery. Closest remaining: GlassSegmented inside the header GlassCard (`page.tsx:105–111`) — translucent-on-glass, but not backdrop-filter material (see #10) |
| 7 | Fixed 120px gleam doesn't scale | ✅ confirmed | `globals.css:408–413` — `radial-gradient(120px 120px at …)` for every surface from chip to card |
| 8 | Clear scrim may be too weak on bright media | ✅ confirmed (unchanged; judgment call) | `.lg-scrim` `globals.css:352–364` — rgba(0,0,0, .28→.12→.04); Clear demo sits on a vivid yellow/pink gradient `page.tsx:219–247` |
| 9 | `concentric()` unused; Dock inner radius 13 ≠ 12 | ✅ confirmed | Defined `GlassEffectContainer.tsx:10–11`, exported `index.ts:3`, zero call sites repo-wide. `GlassDock.tsx`: `radius={18}` `:22` + `p-1.5` (6px) `:25` ⇒ expected 12, actual `rounded-[13px]` `:35` |
| 10 | Segmented / Switch don't use LiquidGlass | ✅ confirmed | Neither imports it — `GlassSegmented.tsx` plain div `bg-white/[0.05]` `:39`; `GlassSwitch.tsx` plain button, rgba background `:33–37` |
| 11 | Pointer gleam tracks under `prefers-reduced-motion` | ✅ confirmed | `handleMove` has no reduced-motion check (`LiquidGlass.tsx:210–227`); only `live` bails `:249`; CSS only disables the opacity transition (`globals.css:483`) — position still tracks |
| 12 | `.lg-edge` doubles backdrop-filter per surface | ✅ confirmed | Own backdrop-filter `globals.css:335–336`; `lens` defaults true `LiquidGlass.tsx:195`. Gallery renders **16** LiquidGlass surfaces ⇒ **32** concurrent backdrop-filter layers (34 with search panel open) — same magnitude as the ~28 reviewed |
| 13 | Gallery uses glass as content cards | ✅ confirmed | In-flow GlassCards `page.tsx:197–216, 229–246, 262–269` vs 007's "glass is the control layer" rule (`plans/007:12–18`). Arguably inherent to a specimen gallery |

### P2 — polish

| # | Finding | Status | Evidence |
|---|---|---|---|
| 14 | Props always extend button props even when `as="div"` | ✅ confirmed | `LiquidGlass.tsx:178–179`; default `as` is div `:204` |
| 15 | `handleMove` rAF not cancelled on unmount | ✅ confirmed | `raf.current` (`LiquidGlass.tsx:219–224`) has no unmount cleanup; only live's `frame` is cleaned `:269–273` |
| 16 | `interactive={false}` still attaches pointer listeners | ✅ confirmed | Always attached `LiquidGlass.tsx:280–281`; handlers bail inside `:213/:232` |
| 17 | Missing `aria-haspopup="listbox"` | ✅ confirmed | Combobox attrs `GlassSearch.tsx:120–127`, no aria-haspopup. (Minor: optional under ARIA 1.2 combobox pattern, but absent as stated) |
| 18 | `role="tablist"` without tab panels | ✅ confirmed | `GlassSegmented.tsx:37` tablist, `:58` tab; no `aria-controls`/tabpanel anywhere — radiogroup semantics would fit better |
| 19 | Dark-theme-only colors, no `--lg-ink` | ✅ confirmed | Zero `--lg-ink` matches repo-wide; hardcoded white-on-dark throughout (e.g. `GlassButton.tsx:50`, `GlassCard.tsx:54`, reduce-transparency bg `globals.css:498–502`) |
| 20 | EffectContainer + concentric not demoed in gallery | ✅ confirmed | Neither in gallery imports `page.tsx:4–22`; no usage repo-wide |
| 21 | No kit tests | ✅ confirmed | `tests/e2e/` contains only `kira.spec.ts`; `playwright.config.ts` exists, so proposed `tests/e2e/liquid-glass.spec.ts` is a natural fit |

### Checked OK — all still true

| Item | Status | Evidence |
|---|---|---|
| Inline backdrop-filter in JSX (Lightning CSS var() gotcha) | ✅ | `LiquidGlass.tsx:293–297`; rationale comment `globals.css:312–315` |
| `.lg-content` in `@layer components` | ✅ | `globals.css:419–425` |
| `prefers-reduced-transparency` / `prefers-contrast` | ✅ | `globals.css:490–504` / `:507–521` |
| `displace` browser limitation documented | ✅ | `LiquidGlass.tsx:44–46` + `plans/007:85–86` |
| `npm run build` passes | ⚠️ | Type-check + CSS + lint pass in sandbox; the bundler step itself couldn't run there (see §2). No code changes since the passing build at review time |

## 4. Summary — GitHub vs chat

- **On GitHub (PR #68):** exactly one commit, `cd50a5a` — 17 files, +1,997 lines: the kit (`app/components/glass/*`), gallery, `globals.css` material layers, plans 006 + 007.
- **Local-only, not pushed:** `plans/008-composer-glass-improvement-brief.md` (the review-task brief) and this report. The review findings exist **only in chat/local docs** — nothing was committed, consistent with "findings only, no fixes".
- **Score:** 20 of 21 findings re-confirmed at current HEAD; **finding 6 not reproduced** — the gallery card footer contains no glass-material button (primary = solid, ghost = outline). All 5 checked-OK items still hold (build verified to the extent the sandbox allows).
- Constraints respected: nothing implemented, no files in your repo modified (build ran on a disposable sandbox copy; the font/config tweaks needed to attempt the build were applied only there).
