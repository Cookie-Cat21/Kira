# Plan 003: Fix the 4 ESLint errors (react-hooks violations) so `npm run lint` exits clean

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7945c29..HEAD -- app/components/store/StoreProductCard.tsx app/components/store/StoreNav.tsx app/components/ThinkingBlock.tsx app/components/store/ProductDetailClient.tsx`
> These four files have *uncommitted* working-tree changes from the storefront
> redesign. **Run `npm run lint` first** (Step 0) to get the authoritative,
> current list of errors — the line numbers below may have shifted.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7945c29`, 2026-06-11

## Why this matters

`npm run lint` currently reports **4 errors** (plus 4 harmless warnings). They
are real `react-hooks` violations, not style nits: one creates a React
component *during render* (which can remount the subtree and discard its state
every render), and others call `setState`/impure functions in places the rules
forbid. `next build` does **not** currently fail on them (verified — the
production build passes), so they are silent: nothing gates them, and they will
accumulate. Getting lint to a clean exit makes it usable as a CI gate (plan 001
wires lint into CI) and removes latent render bugs. This is a small,
self-contained, low-risk cleanup.

## Current state

Confirmed errors (read directly at planning time):

1. **`app/components/store/StoreProductCard.tsx:27` and `:68`** —
   `react-hooks/static-components`. A component is created during render:
   ```tsx
   // :27
   const Icon = categoryIcon();            // returns a component
   // ...
   // :68
   <Icon className="size-10 text-white/30" />
   ```
   `categoryIcon` comes from `./storeIcons`. Read `storeIcons.ts` to see what it
   returns. Fix options, in order of preference:
   - If `categoryIcon()` returns a *stable existing* component reference, hoist
     the call so React sees a stable type, e.g. compute it with `useMemo`:
     `const Icon = useMemo(() => categoryIcon(), []);` — or, better, change the
     call site to render via a wrapper that doesn't alias a component to a
     `const` created in render. The cleanest fix that satisfies the rule is
     usually to **render the icon through a small stable component** or to call
     `categoryIcon` and assign to a capitalized variable *outside* the component
     (module scope) if it takes no per-instance args (it currently takes none).
   - Confirm the chosen fix renders the same icon as before (visual parity).

2. **`app/components/store/StoreNav.tsx:39`** —
   `react-hooks/set-state-in-effect`. Inside the `[q]` search effect, state is
   set synchronously in the effect body:
   ```tsx
   useEffect(() => {
     const term = q.trim();
     if (!term) {
       setResults([]);     // :39  ← flagged
       return;
     }
     setSearching(true);   // :42  ← also a synchronous set in the effect
     const t = setTimeout(async () => { /* fetch + setResults + setSearching */ }, 250);
     return () => clearTimeout(t);
   }, [q]);
   ```
   Fix: avoid the synchronous top-of-effect `setState`. Preferred shapes:
   - Move the empty-term reset into the same async/timeout path, or guard so the
     state is only set inside the debounced callback; or
   - Derive `searching`/`results` differently so the effect doesn't set state
     synchronously on the render pass. Keep the existing debounce (250ms) and
     fetch behavior identical — only the *synchronous-set-in-effect* pattern
     must change.

3 & 4. **`app/components/ThinkingBlock.tsx:17`** and
   **`app/components/store/ProductDetailClient.tsx:70`** — the remaining two
   errors (locations from the prior lint run; verify with Step 0). ThinkingBlock
   :17 is `const startRef = useRef(Date.now());` — calling the impure `Date.now()`
   during render. Likely fix: initialize to a stable value and set the real time
   in an effect, e.g.
   ```tsx
   const startRef = useRef(0);
   useEffect(() => { if (!startRef.current) startRef.current = Date.now(); }, []);
   ```
   For ProductDetailClient:70, run lint to get the exact rule and apply the same
   class of fix as the analogous case above (component-during-render → hoist /
   stabilize; impure-call-in-render → move to effect; set-state-in-effect →
   restructure).

**Conventions**: these are client components (`"use client"`), framer-motion +
lucide-react, 2-space indent. Match the surrounding style. Do not change any
visible behavior or markup beyond what the fix requires.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Lint      | `npm run lint`                | **0 errors** (target) |
| Typecheck | `npx tsc --noEmit`            | exit 0              |
| Build     | `npm run build`               | exit 0              |
| Dev (visual check) | `npm run dev`        | server on :3000     |

## Scope

**In scope** (modify only as needed to clear the errors):
- `app/components/store/StoreProductCard.tsx`
- `app/components/store/StoreNav.tsx`
- `app/components/ThinkingBlock.tsx`
- `app/components/store/ProductDetailClient.tsx`
- `app/components/store/storeIcons.ts` — **read-only reference** (to understand
  `categoryIcon`); modify only if the cleanest fix is to adjust its return type,
  and only if that doesn't change other call sites' behavior.

**Out of scope** (do NOT touch):
- The 4 lint *warnings* (`lib/db.ts` `_params`, `scripts/audit-kapruka.mjs`
  unused vars) — warnings, not errors; leave them.
- Any behavior, styling, or markup change beyond what the rule fix requires.
- The ESLint config — do NOT silence rules with `eslint-disable` comments or by
  weakening `eslint.config.mjs`. Fix the code, not the linter.

## Git workflow

- Branch: `advisor/003-fix-lint-errors`
- One commit, conventional style: `fix: resolve react-hooks lint errors`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 0: Enumerate the current errors (authoritative)

```bash
npm run lint
```
Record the exact 4 errors (file:line + rule). If they differ from "Current
state" above, fix what lint actually reports — the rule name tells you the fix
class.

### Step 1: Fix each error

Apply the smallest change that satisfies each rule (see "Current state" for the
fix per file). After each file, re-run `npm run lint` to confirm that error is
gone and no new one appeared.

**Verify (per file)**: `npm run lint` shows one fewer error each time.

### Step 2: Confirm clean lint + green build + visual parity

```bash
npm run lint        # 0 errors
npx tsc --noEmit    # exit 0
npm run build       # exit 0
```
Then `npm run dev` and load `/shop` and a `/product/<id>` page; confirm the
category icons, the nav search, the product detail image, and the chat
"thinking" timer all still render and behave as before.

**Verify**: `npm run lint` exits with **0 errors** (warnings may remain).

## Test plan

- No new unit tests (these are render-pattern fixes; behavior is unchanged).
- Regression check is the visual parity step above + `npm run lint` = 0 errors.
- If plan 001 has landed and you fixed `StoreNav` search logic in a way that
  exposes a pure helper, a small test is welcome but not required.

## Done criteria

ALL must hold:

- [ ] `npm run lint` reports **0 errors** (warnings allowed)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] No `eslint-disable` comments were added and `eslint.config.mjs` is
      unchanged (`git diff eslint.config.mjs` empty)
- [ ] Visual parity confirmed on `/shop`, a product page, and the chat thinking
      indicator
- [ ] Only in-scope files modified — `git status`
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report if:

- After Step 0 there are *more* than 4 errors, or errors in files not listed
  here (drift — the uncommitted storefront work changed things; report the new
  list before proceeding).
- A fix requires changing visible behavior or markup to satisfy the rule
  (it shouldn't — report the case).
- `categoryIcon()` turns out to take per-instance arguments at the call site
  (it currently takes none) — the hoist-to-module-scope fix would be wrong;
  report and use a `useMemo` keyed on those args instead.

## Maintenance notes

- After this lands, plan 001's CI lint step turns green and starts *gating*
  these rules — future violations will fail CI, which is the goal.
- A reviewer should check that the `StoreProductCard` icon fix didn't change
  which icon renders for each category, and that the `StoreNav` search still
  debounces (250ms) and clears results on an empty query.
