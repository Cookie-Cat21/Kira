---
name: apple-ultra-skills
description: >
  Ultra-tier AI agent skill combining 50+ top skills.sh patterns into one.
  Context-aware: auto-activates frontend, design, architecture, testing, security,
  performance, accessibility, agent, and devops expertise based on what you are doing.
  Use when building components, APIs, tests, or reviewing code — even if user does not
  say "apple ultra". Pairs with Agent-Reach for live docs research.
metadata:
  pack: apple-ultra
  version: "1.3.0"
reads:
  - references/frontend.md
  - references/design.md
  - references/architecture.md
  - references/testing.md
  - references/security.md
  - references/performance.md
  - references/accessibility.md
  - references/agent-patterns.md
  - references/agent-reach.md
  - references/devops.md
  - references/next-app-router.md
  - references/react-18-patterns.md
  - references/tailwind-v4.md
---

# Apple Ultra Skills

## Section 0: The Ultra Principle

You are operating in **Apple Ultra Mode**. This means:

- **Read context FIRST.** Before doing anything, identify which ultra-modes are active based on what is being built (file type, imports, user intent, directory structure).
- **Apply ALL relevant modes simultaneously.** Building a React component? Frontend Ultra + Design Ultra + Accessibility Ultra all activate together.
- **Be MORE specific than generic advice.** Every rule must be actionable within 30 seconds. Never say "write clean code." Say exactly what clean means in this context.
- **Synthesize across domains.** When writing UI, performance rules apply. When writing APIs, security rules apply. Cross-domain awareness is what makes Ultra different.
- **Self-reference the `/references` directory** when you need depth beyond SKILL.md.

Mark ⚡ for critical rules (violations cause real user harm or major bugs).
Mark 🎯 for high-impact rules (significant quality improvement).
Mark 💡 for insight rules (non-obvious, expert-level patterns).

---

## Section 1: Context Detection Engine

Detect active mode(s) by reading:

1. **File extension** — `.tsx`/`.jsx`/`.vue`/`.svelte` → Frontend Ultra active
2. **Imports present** — `import { test }` → Testing Ultra; `import { NextRequest }` → API Ultra
3. **Directory path** — `components/` → Design + Frontend; `__tests__/` → Testing
4. **User's stated intent** — "make this faster" → Performance; "review this" → Architecture
5. **Adjacent files** in the same directory

Multiple modes activate simultaneously — this is expected and correct.

### Detection Matrix

| Signal | Active Modes |
|--------|-------------|
| `.tsx` in `components/` | Frontend, Design, Accessibility |
| `route.ts` or `api/` | Architecture, Security, Performance |
| `__tests__/` or `.test.ts` | Testing |
| `middleware.ts` | Security, Architecture, Performance |
| User says "deploy" | DevOps, Security |
| User says "agent" or `mcp` | Agent & Workflow |
| `globals.css` or `tokens` | Design, Frontend, Accessibility |
| `app/` or `page.tsx` (App Router) | Frontend, next-app-router |
| `useTransition` / `useId` imports | react-18-patterns, Frontend |
| `tailwind.config` or `@theme` | tailwind-v4, Design, Frontend |
| User says "research" or "docs" | Agent-Reach, Agent & Workflow |

### Activation Protocol

1. Scan open file + imports + directory
2. Parse user message for intent keywords
3. List active modes at start of complex tasks: `Active: Frontend Ultra, Design Ultra, A11y Ultra`
4. Load depth from `/references/[mode].md` when rules exceed SKILL.md scope

---

## Section 2: Frontend Ultra-Mode

Synthesized from: frontend-design, react-best-practices, web-design-guidelines, ui-ux-pro-max, composition-patterns, interaction-design, fixing-motion-performance.

### COMPONENT DESIGN

1. ⚡ Never pass more than 5 props to a leaf component; extract compound components or use context instead.
2. ⚡ Every interactive element must have all 5 states defined: default, hover, focus, active, disabled. Missing any state is an incomplete component.
3. 🎯 Use composition (children, render props, slots) before adding a new prop. Ask: "Could the caller decide this instead of the component?"
4. 🎯 Co-locate state with the component that needs it. Only lift state when 2+ siblings need the same value.
5. 💡 Compound components (`Menu` + `Menu.Item` + `Menu.Trigger`) are better than a single component with 8 config props — they stay composable as requirements grow.
6. ⚡ Never use index as a React key for lists that can reorder or filter. Use a stable, unique ID from the data.
7. 🎯 Avoid `useEffect` for derived state — compute it directly in render. Only `useEffect` for synchronizing with external systems (timers, subscriptions, DOM APIs).
8. 🎯 Extract event handlers that exceed 3 lines into named functions — inline lambdas in JSX obscure component structure.
9. 💡 Prefer `useReducer` over multiple `useState` when state transitions are coupled (form wizards, multi-step flows).
10. ⚡ Wrap route-level components in error boundaries — an unhandled render error must not white-screen the entire app.
11. 🎯 Use `React.Suspense` with meaningful fallbacks at route boundaries, not spinners on every micro-component.
12. 💡 Portals (`createPortal`) for overlays, tooltips, and modals — never `position: fixed` inside `overflow: hidden` parents without a portal.

### STYLING

13. ⚡ Never use raw color values in component styles. Always use semantic design tokens (`--color-primary`, not `#3B82F6`). This is what makes dark mode work without extra work.
14. 🎯 Use fluid type scales (`clamp()`) instead of breakpoint-based font sizes. Typography should scale continuously, not in steps.
15. 🎯 Use a 4pt spacing grid (4, 8, 12, 16, 24, 32, 48, 64, 96px). Arbitrary spacing values (23px, 37px) are always wrong.
16. ⚡ Images MUST have explicit width and height attributes or CSS `aspect-ratio` to prevent layout shift (CLS). Undimensioned images are a Core Web Vitals failure.
17. 💡 Use CSS logical properties (`padding-inline`, `margin-block`) instead of left/right/top/bottom for automatic RTL support.
18. 🎯 Prefer CSS custom properties + data attributes for variant styles over conditional class logic. `data-variant="primary"` scales better than 8 `className` conditionals.
19. ⚡ Always include `prefers-reduced-motion` media query for any animation over 200ms. Vestibular disorders affect 35% of adults over 40.
20. 🎯 Co-locate component styles: CSS Modules or Tailwind in the same file as the component — not a global stylesheet per component.
21. 💡 Use `@layer` in Tailwind to control specificity: `base` → `components` → `utilities`. Custom overrides belong in `components`, not `utilities`.
22. 🎯 Mobile-first media queries: write base styles for mobile, add `min-width` breakpoints for larger screens — never `max-width` desktop-first.

### PERFORMANCE

23. ⚡ Lazy-load every non-above-the-fold route with dynamic import / `React.lazy`.
24. 🎯 Memoize (`useMemo`, `useCallback`, `React.memo`) ONLY after measuring with React DevTools Profiler. Premature memoization adds allocation cost with no benefit.
25. ⚡ Never import an entire library when you need one function: `import debounce from 'lodash/debounce'`, not `import { debounce } from 'lodash'`.
26. 🎯 In Next.js App Router: prefer Server Components by default; only add `'use client'` when you need browser APIs, event handlers, or hooks.
27. 🎯 Use `startTransition` for non-urgent state updates (filtering large lists, tab switches) to keep INP under 200ms.
28. 💡 Virtualize lists over 50 items (`@tanstack/react-virtual`) — rendering 1000 DOM nodes kills scroll performance.
29. ⚡ Debounce search inputs (300ms) and throttle scroll handlers (16ms) — unthrottled handlers cause INP failures.
30. 🎯 Prefetch links on hover (`<Link prefetch>`) for perceived instant navigation in Next.js.

### ZERO GENERIC AI AESTHETIC RULE

31. ⚡ Distinctive design only. No generic gradient cards, no default Tailwind blue buttons, no cookie-cutter hero sections with centered headline + subtitle + CTA. Every component must have a design decision that makes it specific to this product.
32. 🎯 Before generating any UI, ask: "Would I see this exact design on a generic SaaS landing page?" If yes, redesign it.
33. 💡 Pick ONE bold design choice per screen: asymmetric layout, distinctive typeface, unexpected color accent, or editorial whitespace — not all at once.
34. 🎯 Reference real products for inspiration (Linear, Raycast, Stripe) — not other AI-generated UIs.

### FORM & DATA PATTERNS

35. ⚡ Form validation: Zod schema shared between client (react-hook-form) and server (API route) — one source of truth.
36. 🎯 Optimistic UI updates with rollback on error — TanStack Query `onMutate` + `onError` pattern.
37. 💡 Debounce search inputs 300ms, throttle scroll handlers 16ms — unthrottled handlers cause INP failures.
38. 🎯 Empty states designed for every list — illustration, message, primary CTA. Not blank space.
39. ⚡ Loading skeletons match final content dimensions — shape and size, not generic gray boxes.

### VUE / SVELTE PATTERNS

40. 🎯 Vue: use `<script setup>` + Composition API for all new components. Options API only for legacy maintenance.
41. 🎯 Svelte: leverage `$:` reactive statements for derived state instead of computed stores when scope is local.
42. 💡 Vue slots map to React children; Svelte slots map to both — use named slots for compound component patterns.

→ Deep dive: [references/frontend.md](./references/frontend.md)

---

## Section 3: Design Ultra-Mode

Synthesized from: canvas-design, brand-guidelines, interface-design, design-lab, theme-factory, fixing-accessibility, high-end-visual-design, algorithmic-art, wcag-audit-patterns.

### VISUAL HIERARCHY

1. 🎯 Maximum 3 levels of visual hierarchy per screen section: primary (one element), secondary (2-4 elements), tertiary (everything else). More levels = visual chaos.
2. ⚡ Never use color as the ONLY differentiator between two states. Always pair with shape, label, or icon. (WCAG 1.4.1)
3. 💡 Whitespace is not empty space — it is an active design element. Double the whitespace you think you need; halve it if it feels disconnected.
4. 🎯 Group related elements with proximity (Gestalt) — if two items are within 8px, they are perceived as one unit.
5. 🎯 Use size + weight + color together for hierarchy — never rely on a single axis.
6. 💡 F-pattern for text-heavy pages, Z-pattern for marketing hero sections — place CTAs at scan-line endpoints.

### TYPOGRAPHY

7. 🎯 Type scale: use a ratio-based scale (1.25 Major Third or 1.333 Perfect Fourth). The exact values: 12, 14, 16, 20, 24, 32, 40, 48, 64px (base-16 × 1.25 ratio).
8. ⚡ Body text: minimum 16px, 1.5 line-height, 60-75 characters per line max. Anything narrower is uncomfortable to read; anything wider loses the reader's place.
9. 🎯 Use variable fonts when available — they give you weight, width, and optical size in one file. Set `font-optical-sizing: auto` always.
10. 💡 Headline fonts and body fonts should contrast in personality (geometric sans + humanist serif, slab serif + grotesque) not just in size.
11. 🎯 Limit to 2 font families per product: one display, one body. Three families is the absolute maximum.
12. 🎯 Tabular figures (`font-variant-numeric: tabular-nums`) for all data tables and price displays — proportional figures cause column jitter.

### COLOR

13. ⚡ Use `oklch()` for color definitions in 2024+. It produces perceptually uniform lightness and enables P3 wide-gamut displays. `oklch(60% 0.15 250)` beats `hsl()`.
14. 🎯 Every color decision needs a contrast ratio check. Minimum 4.5:1 for body text, 3:1 for large text (18px+ or 14px+ bold), 3:1 for UI components. (WCAG 1.4.3)
15. 🎯 Build semantic color tokens in layers: primitive (`blue-500`) → semantic (`color-action`) → component (`button-background`). Never skip the semantic layer.
16. ⚡ Dark mode: define it at the token layer, not with `dark:` utility classes per component. One token change should update every component.
17. 💡 Limit accent colors to 1-2 per screen. More accents = no accent hierarchy.
18. 🎯 Status colors: success (green), warning (amber), error (red), info (blue) — never invent new hues for system feedback.

### MOTION & INTERACTION

19. ⚡ Every CSS transition: use cubic-bezier easing, never linear. For enter: ease-out (things decelerate into place). For exit: ease-in (things accelerate away).
20. 🎯 Duration rules: micro-interactions (hover, focus) 100-150ms. State changes 200-300ms. Page transitions 300-500ms. Never over 500ms for UI feedback.
21. 💡 Spring physics (CSS `linear()` or framer-motion spring) feels more natural than cubic-bezier for elements that have mass (modals, drawers, cards).
22. ⚡ `@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }` must be in your global CSS. Always.
23. 🎯 Stagger list item animations by 30-50ms — simultaneous entrance feels mechanical.
24. 💡 Loading skeletons should match the exact dimensions of the content they replace — shape, not just a gray rectangle.

### ELEVATION & DEPTH

25. 🎯 Define an explicit elevation scale (0-5 levels) with corresponding shadow values. Never use ad-hoc `box-shadow` values. Each elevation level signals a z-axis layer.
26. 💡 In dark mode: elevation is expressed by lightness increase, not shadow intensity. A dark card at elevation 2 is lighter than the background, not more shadowed.
27. 🎯 Z-index scale: define tokens (`--z-dropdown: 100`, `--z-modal: 200`, `--z-toast: 300`) — never arbitrary `z-index: 9999`.
28. 🎯 Borders over shadows for subtle separation in dense UIs — shadows compete with content in data-heavy interfaces.

### BRAND & IDENTITY

29. 🎯 Every product needs a distinctive visual signature — one element users recognize instantly (color, shape, motion).
30. 💡 Brand consistency: same spacing, typography, and color tokens across marketing and product — not two design systems.
31. 🎯 Logo clear space: minimum padding equal to logo height on all sides — never crowd the mark.
32. ⚡ Favicon, OG image, and app icon from same source asset — consistent across touchpoints.

→ Deep dive: [references/design.md](./references/design.md)

---

## Section 4: Architecture Ultra-Mode

Synthesized from: improve-codebase-architecture, composition-patterns, to-prd, to-issues, diagnose, grill-me, grill-with-docs.

### BEFORE TOUCHING CODE

1. 🎯 Map the current dependency graph before any refactor. Draw (or describe) what currently imports what. The refactor target becomes clear from the graph.
2. ⚡ Name the architectural smell before proposing a fix. "God component" → extract domain. "Prop drilling >3 levels" → context or composition. "Data fetching in UI component" → co-locate with Server Component or move to hook.
3. 💡 Ask: "If this module had to be extracted into a separate package tomorrow, what would break?" The answer reveals hidden coupling.
4. 🎯 Read the 3 most recent PRs touching the same area — understand the trajectory before adding to it.
5. 💡 Check for existing ADRs (Architecture Decision Records) before proposing structural changes.

### MODULE DESIGN

6. ⚡ Single Responsibility at the module level: one reason to change per file. If you can write two unrelated unit tests for the same module, it needs splitting.
7. 🎯 Feature slicing: organize by feature, not by type. `src/features/auth/` beats `src/components/` + `src/hooks/` + `src/utils/` for anything beyond toy projects.
8. 🎯 Dependency direction: features → shared; never shared → features. Circular dependencies are always a design error.
9. 💡 The rule for shared utilities: if you've copy-pasted something 3 times, extract. If you've needed it in 2 features, consider `shared/`. Not before.
10. 🎯 Barrel exports (`index.ts`) only at feature boundaries — not in every subdirectory. Deep barrel exports hide dependency graphs and slow builds.
11. ⚡ No default exports for shared modules — named exports enable better tree-shaking and refactoring.
12. 💡 Colocate tests next to source (`Button.test.tsx` beside `Button.tsx`) — not in a separate `__tests__/` tree.

### PRD & ISSUE CREATION

13. 🎯 When a user describes a new feature, respond with a structured mini-PRD first: Goal | Success Metrics | Scope (in/out) | Key Decisions | Risks | Implementation Notes. Confirm before implementing.
14. 🎯 Break every PRD into atomic GitHub issues. Each issue: one deliverable, clear acceptance criteria, estimated size (S/M/L), dependency list.
15. 💡 Issues should be written for a developer who has never spoken to you. Full context in the body, no external references needed.
16. 🎯 Acceptance criteria format: "Given [state], when [action], then [observable outcome]" — same as test naming.

### SOCRATIC CODE REVIEW

17. ⚡ Before approving any architectural decision, ask: "What would have to be true for this to be wrong?" If you cannot answer, the decision is not well-reasoned.
18. 🎯 When reviewing a design pattern, cite the official docs or authoritative source, not memory. Docs are ground truth; memory drifts.
19. 💡 The hardest architectural bugs are the ones you did not introduce — they were always there. When diagnosing: follow the data flow from source to symptom, form a hypothesis, then verify with the smallest possible change.
20. 🎯 Every refactor PR must state: what changed, what didn't change (behavior parity), and how to verify.
21. 💡 Prefer strangler fig pattern over big-bang rewrites — migrate one route/feature at a time behind a feature flag.

### DIAGNOSTIC PATTERNS

22. 🎯 When code is hard to understand, trace one request end-to-end before proposing changes.
23. 💡 Git blame on confusing lines — understand why code exists before deleting it.
24. 🎯 Complexity budget: if a module needs a diagram to explain, it needs simplification.
25. ⚡ Circular imports are always a design error — extract shared code to break the cycle.

→ Deep dive: [references/architecture.md](./references/architecture.md)

---

## Section 5: Testing Ultra-Mode

Synthesized from: tdd, grill-me, grill-with-docs, web-design-guidelines (testing sections).

### TDD WORKFLOW

1. ⚡ Red → Green → Refactor. Always. Writing tests after implementation is documentation, not TDD. The value of TDD is in letting the test drive the design.
2. 🎯 Write the simplest failing test first. Not the perfect test. The simplest one that proves the behavior does not exist yet.
3. ⚡ Test behavior, not implementation. If refactoring internals breaks your tests without changing external behavior, the tests are testing the wrong thing.
4. 🎯 One assertion per test when possible — multiple assertions make failure diagnosis ambiguous.
5. 💡 Test the contract at module boundaries, not internal helpers — internals are free to change.

### TEST NAMING

6. 🎯 Format: "given [precondition], when [action], then [expected outcome]"
   Example: "given an unauthenticated user, when they access /dashboard, then they are redirected to /login"
   Never: "test1", "works correctly", "handleSubmit test"
7. 🎯 Group tests with `describe` blocks matching the module/function under test — flat test files are unnavigable.

### WHAT TO TEST

8. ⚡ Test pyramid: many unit tests (fast, isolated) → fewer integration tests (real dependencies) → few E2E tests (critical user paths only).
9. 🎯 E2E tests cover the 5 flows that, if broken, mean the business stops: sign up, log in, core action (buy/publish/submit), payment, log out.
10. 💡 Do not mock what you do not own. Mock 3rd party APIs. Use real implementations for your own code. Real implementations find real bugs.
11. ⚡ Never use `Math.random()` or `Date.now()` in tests. Use `vi.setSystemTime()` or fixed seed values. Flaky tests are worse than no tests.
12. 🎯 Test error paths explicitly — happy path tests give false confidence. Every `catch` block needs a test.
13. 💡 Property-based testing (`fast-check`) for pure functions with many input combinations — catches edge cases humans miss.

### COVERAGE

14. 🎯 Coverage % is a proxy metric, not a goal. 80% coverage with tests that only check happy paths is worse than 60% that catches the real edge cases.
15. 💡 Ask after writing tests: "What scenario would make the code fail without my tests catching it?" If the answer exists, write that test.
16. 🎯 Mutation testing (`stryker`) quarterly — if mutants survive, your tests are checking existence, not behavior.

### TEST INFRASTRUCTURE

17. 🎯 MSW for API mocking in tests — intercept at network level, test real fetch/query code.
18. 💡 Factory functions (`buildUser()`) over inline test data — composable, maintainable.
19. 🎯 Playwright for E2E: semantic selectors (`getByRole`), page object model, parallel shards in CI.
20. ⚡ `@axe-core/playwright` in E2E — accessibility regression caught in CI, not production.

→ Deep dive: [references/testing.md](./references/testing.md)

---

## Section 6: Security Ultra-Mode

OWASP Top 10 applied to frontend + API.

1. ⚡ Never trust client-side data on the server. Validate EVERYTHING at the API boundary with a schema (Zod, Yup, Valibot). Client validation is UX; server validation is security.
2. ⚡ XSS: Never use `dangerouslySetInnerHTML` without sanitizing with DOMPurify. Never use `innerHTML` with user content. Never `eval()` user input.
3. ⚡ Never store JWTs in `localStorage`. Use `httpOnly` cookies. `localStorage` is accessible to any JS on the page, including injected scripts.
4. ⚡ CSRF: every state-mutating API endpoint (POST/PUT/PATCH/DELETE) must verify a CSRF token or use `SameSite=Strict` cookies.
5. ⚡ Never log sensitive data (passwords, tokens, PII) in console, server logs, or error tracking. These end up in dashboards accessible to many engineers.
6. 🎯 Dependency audit: run `npm audit` before every release. Any HIGH or CRITICAL vulnerability is a blocker, not a suggestion.
7. ⚡ Never hardcode secrets, API keys, or credentials in source code. Use `.env` files (gitignored) for local dev, and environment variable injection for all environments. Run `git log --all -S "sk-" --source` periodically to catch accidental commits.
8. 🎯 Content Security Policy header on every production app. Start with `default-src 'self'` and explicitly add necessary external sources.
9. 💡 Principle of least privilege: API tokens and service accounts should have only the permissions they actively use. Audit and rotate credentials quarterly.
10. ⚡ Rate-limit all public API endpoints — 100 req/min per IP for auth endpoints, 1000 req/min for read endpoints.
11. 🎯 Input sanitization at boundary + output encoding at render — defense in depth, not either/or.
12. ⚡ SQL injection: always parameterized queries. Never string-interpolate user input into SQL — even "safe" internal tools.
13. 🎯 Set security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.
14. 💡 SSRF: validate and allowlist URLs before server-side `fetch()`. Block internal IPs (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x).
15. 🎯 Broken access control: verify resource ownership on every request — `userId` from session, not from request body.
16. ⚡ Password storage: bcrypt (cost 12+) or argon2id — never MD5, SHA, or plaintext. Enforce 12+ character minimum.
17. 🎯 MFA for admin accounts and sensitive operations — TOTP or WebAuthn, not SMS (SIM swap risk).
18. 💡 Supply chain: pin dependencies with lockfiles, review new packages for download count + maintainer reputation before adding.
19. 🎯 Session fixation: regenerate session ID on login. Set `Secure`, `HttpOnly`, `SameSite=Strict` on session cookies.
20. ⚡ File upload: validate MIME type server-side (not just extension), scan for malware, store outside webroot.

### API & INFRASTRUCTURE SECURITY

21. 🎯 API versioning in URL path (`/v1/`) — version on breaking changes, not every deploy.
22. 💡 Webhook endpoints: verify HMAC signature, process idempotently, return 200 quickly.
23. 🎯 CORS preflight: handle OPTIONS requests correctly — missing preflight breaks browser clients.
24. ⚡ Docker: non-root user, minimal base image (distroless/alpine), no secrets in image layers.
25. 🎯 Secrets rotation: quarterly for API keys, immediately on team member departure.

→ Deep dive: [references/security.md](./references/security.md)

---

## Section 7: Performance Ultra-Mode

### CORE WEB VITALS TARGETS (non-negotiable)

1. ⚡ LCP (Largest Contentful Paint): < 2.5s. Check: is the LCP element an image? If so, it must have `fetchpriority="high"` and must NOT be lazy-loaded.
2. ⚡ INP (Interaction to Next Paint): < 200ms. Long tasks (>50ms) on the main thread cause INP failures. Profile with Chrome DevTools → Performance → Main thread.
3. ⚡ CLS (Cumulative Layout Shift): < 0.1. Every image, ad slot, and dynamically-injected element must have reserved space before it loads.
4. 🎯 TTFB (Time to First Byte): < 800ms. Use CDN edge caching, connection pooling, and database query optimization.
5. 🎯 FCP (First Contentful Paint): < 1.8s. Inline critical CSS, defer non-critical resources.

### BUNDLE

6. 🎯 Check bundle size with `npx bundlesize` or bundle-analyzer before adding any dependency > 10KB gzipped. Is there a smaller alternative?
7. ⚡ Split code at route boundaries. Every page bundle should only include what that page needs. Shared chunks must be explicitly configured, not left to defaults.
8. 💡 Tree-shaking only works with ES modules. If a library ships only CJS, you get the whole thing. Check the package.json `"module"` field before importing.
9. 🎯 Dynamic import heavy libraries (charts, editors, maps) — they are never needed on first paint.
10. 💡 `preconnect` to third-party origins you will fetch from; `prefetch` for likely next navigation; `preload` only for critical current-page resources.

### IMAGES

11. ⚡ Always use `next/image` (Next.js) or equivalent image component. Never a raw `<img>` for user-facing images. Automatic WebP/AVIF conversion + lazy loading + sizing.
12. 🎯 Use AVIF for photographs (50% smaller than WebP), WebP for illustrations, SVG for icons and logos. Never PNG when AVIF/WebP is available.
13. 🎯 Responsive images: `srcset` + `sizes` attributes — serve 400w on mobile, 800w on tablet, 1200w on desktop.
14. 💡 Blur-up placeholders (LQIP) for hero images — perceived performance beats actual performance.

### FONTS

15. ⚡ `font-display: swap` on all custom fonts. Invisible text while fonts load is a UX failure that costs users time.
16. 🎯 Self-host fonts via `next/font` or `@fontsource`. Third-party font CDNs add a DNS lookup + TLS handshake on every page load.
17. 🎯 Subset fonts to used character ranges — a Latin-only app does not need CJK glyphs.
18. 💡 Preload only the single font weight used for above-the-fold text — preloading all weights wastes bandwidth.

### RENDERING

19. 🎯 SSR for dynamic personalized content, SSG for marketing pages, ISR for semi-static content, CSR only for authenticated dashboards.
20. 💡 Streaming SSR with React Suspense — send the shell immediately, stream slow data sections as they resolve.

→ Deep dive: [references/performance.md](./references/performance.md)

---

## Section 8: Accessibility Ultra-Mode

WCAG 2.2 AA compliance by default.

1. ⚡ Every `<img>` needs alt text. Decorative images: `alt=""`. Informative images: describe the content, not the appearance. "Chart showing Q3 revenue grew 40%" not "graph.png".
2. ⚡ Every form input needs a visible `<label>` associated via `htmlFor` + `id`, OR `aria-label`, OR `aria-labelledby`. Placeholder text is NOT a label — it disappears on input.
3. ⚡ Focus must be visible at all times. Never remove `:focus-visible` outline without providing a custom visible alternative. Check in keyboard-only mode.
4. ⚡ Every interactive element must be reachable and operable by keyboard alone. Tab to reach it. Enter/Space to activate it. Escape to dismiss overlays.
5. ⚡ Minimum touch target: 44×44px (WCAG 2.5.8). Add padding, not just visual size.
6. 🎯 Color contrast: 4.5:1 for normal text, 3:1 for large text and UI components. Use Colour Contrast Analyser or browser DevTools accessibility panel.
7. 🎯 `aria-live` regions for all dynamic content that updates without a page navigation. Shopping cart count, toast notifications, form errors all need `aria-live="polite"` or `aria-atomic="true"`.
8. 💡 Test with a screen reader at least once before shipping any new component. VoiceOver (Mac/iOS) or NVDA (Windows) with Firefox. What you hear IS the product for 7.6M Americans who use screen readers.
9. ⚡ Modals/dialogs: must trap focus inside while open, return focus to trigger on close, and be dismissible with Escape. All three, always.
10. 🎯 Page language: `<html lang="en">` on every page. Mark foreign phrases with `lang` attribute.
11. 🎯 Skip navigation link as first focusable element: `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>`.
12. ⚡ Heading hierarchy: one `<h1>` per page, no skipped levels (h1 → h3 without h2). Headings are the screen reader table of contents.
13. 🎯 Link text must describe destination — "Read our privacy policy" not "click here".
14. 💡 `role="status"` for success messages, `role="alert"` for errors — semantic HTML first, ARIA roles when HTML is insufficient.
15. 🎯 Form errors: associate with `aria-describedby`, announce on submit failure, suggest corrections (WCAG 3.3.1, 3.3.3).
16. ⚡ No content that flashes more than 3 times per second (WCAG 2.3.1 — seizure risk).
17. 🎯 Text must be resizable to 200% without loss of content or functionality (WCAG 1.4.4).
18. 💡 `inert` attribute on background content when modal is open — prevents focus escape better than `aria-hidden` alone.
19. 🎯 Tables: use `<th scope="col|row">`, `<caption>` for data tables. Never use tables for layout.
20. ⚡ Custom components must have correct ARIA roles, states, and properties — a `<div onClick>` is not a button.

→ Deep dive: [references/accessibility.md](./references/accessibility.md)

---

## Section 9: Agent & Workflow Ultra-Mode

Synthesized from: agent-browser, mcp-builder, web-artifacts-builder, schedule, diagnose, vercel-deploy-claimable.

### DEBUGGING PROTOCOL

1. ⚡ Before touching code: form a hypothesis. "The bug is in X because Y." Then find the smallest reproduction. Changing code before understanding the cause is guessing.
2. 🎯 Follow the data. Start at the source (where data enters the system), follow it to the symptom (where the wrong value appears). The bug is where the data diverges from expectation.
3. 💡 When a bug seems impossible given the code, check: Is the code you are reading the code that is running? (Build cache, wrong environment, wrong file, hot-reload lag.)
4. 🎯 Binary search the problem space: disable half the system, see if bug persists, repeat.
5. 💡 Read the error message completely — the answer is usually in the last line of the stack trace, not the first.

### AGENT WORKFLOWS

6. ⚡ Plan → Execute → Verify loop for every multi-step agent task. Never skip Verify. A task is not done until you have confirmed the output matches the goal.
7. 🎯 When building MCP servers: one tool per distinct capability. Tools should be composable, not monolithic. Each tool: clear name, description the LLM will read, typed input schema (Zod), typed output.
8. 💡 Use semantic browser selectors for automation: `getByRole`, `getByText`, `getByLabel`. Never CSS selectors or XPath in agent browser tasks — they break on redesigns.
9. 🎯 Error recovery in agent loops: catch specific errors, log them with context, retry with exponential backoff (max 3 attempts), then escalate to human. Never silent-fail.
10. ⚡ Agent output format: always match what the next step needs. If a downstream tool expects JSON, return JSON. Type your agent outputs.
11. 🎯 Idempotent tool design: calling the same tool twice with the same input should not create duplicate side effects.
12. 💡 Context window management: summarize completed steps, keep only active task context — don't carry full conversation history into every tool call.
13. 🎯 Parallelize independent tool calls — sequential when calls depend on prior results.
14. ⚡ Human-in-the-loop for irreversible actions (delete, deploy to production, send email) — always confirm before executing.
15. 💡 Tool descriptions are prompts: write them for the LLM reader, not the human developer. Include when to use AND when NOT to use.

→ Deep dive: [references/agent-patterns.md](./references/agent-patterns.md)

---

## Section 10: Documentation Ultra-Mode

Synthesized from: writing-guidelines, doc-coauthoring, grill-with-docs.

1. 🎯 Every public API (function, component, endpoint) needs: purpose (1 sentence), parameters (name + type + description + required/optional), return value, and one runnable example. Nothing more. Nothing less.
2. ⚡ Code examples must be copy-paste runnable with zero modification. No placeholder URLs, no `YOUR_API_KEY` without specifying exactly where to get it.
3. 🎯 Docs structure: Quick Start (works in < 5 minutes) → Core Concepts → API Reference → Guides → Troubleshooting. Never start with concepts — start with a win.
4. 💡 "Why does this exist?" is the most important question your docs must answer, usually in the first paragraph. Skip it and users bounce.
5. ⚡ Reference official docs as the source of truth, not your memory. When explaining a framework behavior, link to the framework's own docs.
6. 🎯 README must include: install command, one usage example, link to full docs. Three things above the fold.
7. 🎯 Changelog entries: what changed, why, and migration steps for breaking changes.
8. 💡 Diagrams for architecture docs, code for API docs — never prose describing what a diagram would show.
9. 🎯 Error messages in docs mirror actual error messages in code — users search for the exact string.
10. 💡 Version docs alongside code — outdated docs are worse than no docs.

---

## Section 11: Ultra Self-Improvement Protocol

This skill must improve itself. Follow these instructions:

1. 💡 When you encounter a situation not covered by these rules, note it as a gap.
   Format: `SKILL GAP DETECTED: [situation]. Suggested rule: [proposed rule].`
   Add it to the relevant `/references/` file for the next session.
2. 🎯 When a rule produces a bad outcome, flag it: `RULE CONFLICT: [rule] produced [bad outcome] because [reason]. Suggested refinement: [refined rule].`
3. ⚡ Synthesize new patterns from the codebase you are working in. If the project has established conventions that are better than these rules, the project wins.
   Note: `PROJECT OVERRIDE: [local convention] overrides [global rule] here.`

### Reference Index

| File | Domain | Rules |
|------|--------|-------|
| [frontend.md](./references/frontend.md) | React, Next.js, Vue, Svelte, Web APIs | 150+ |
| [design.md](./references/design.md) | Visual design, typography, color, motion | 200+ |
| [architecture.md](./references/architecture.md) | SOLID, feature-slicing, API design | 100+ |
| [testing.md](./references/testing.md) | TDD, E2E, mocking, CI | 80+ |
| [security.md](./references/security.md) | OWASP Top 10, auth, CSP | Full checklist |
| [performance.md](./references/performance.md) | Core Web Vitals, bundle, images | Full guide |
| [accessibility.md](./references/accessibility.md) | WCAG 2.2 AA audit checklist | Full checklist |
| [agent-patterns.md](./references/agent-patterns.md) | MCP, browser automation, agent loops | Full guide |
| [devops.md](./references/devops.md) | CI/CD, deployment, monitoring | Full guide |
| [next-app-router.md](./references/next-app-router.md) | Next.js App Router production gotchas | 30+ |
| [react-18-patterns.md](./references/react-18-patterns.md) | React 18 concurrent patterns | 30+ |
| [tailwind-v4.md](./references/tailwind-v4.md) | Tailwind v4 CSS-first config | 30+ |
| [agent-reach.md](./references/agent-reach.md) | Agent-Reach channel reference | Full guide |

---

## Section 12: DevOps Ultra-Mode

Synthesized from: vercel-deploy-claimable, GitHub Actions patterns, infrastructure best practices.

1. ⚡ CI pipeline: lint → typecheck → test → build → deploy. Fail fast at each stage.
2. 🎯 PR preview deployments for every pull request — test the actual artifact, not local dev.
3. ⚡ Never skip staging on the path to production — local → preview → staging → production.
4. 🎯 Environment variables validated at startup with Zod — fail fast on missing config.
5. 💡 Backward-compatible database migrations always — deploy code that works with old AND new schema.
6. 🎯 One-click rollback ready: keep previous deployment artifact, define rollback triggers (error rate >1%).
7. ⚡ Security headers on every production response: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
8. 🎯 `npm ci` in CI — exact versions from lockfile, not `npm install`.
9. 💡 Cache `node_modules` and build outputs in CI keyed on lockfile hash.
10. 🎯 Monitoring: Sentry for errors, Vercel Analytics for Web Vitals, uptime checks every 5 minutes.
11. ⚡ Dependabot/Renovate for automated dependency updates — weekly PRs.
12. 🎯 Feature flags for risky deploys — deploy code dark, enable gradually.
13. 💡 Canary deploys: 5% traffic to new version, monitor error rate, ramp to 100%.
14. 🎯 Smoke tests after every deploy: health endpoint + critical user path.
15. ⚡ Secrets in CI via OIDC or secret manager — never long-lived credentials in workflow files.

→ Deep dive: [references/devops.md](./references/devops.md)

---

## Section 13: Cross-Domain Synthesis

Ultra's power is applying multiple modes simultaneously. These cross-domain rules are what no single skill provides:

### Building UI Components

1. ⚡ Frontend (5 states) + Design (hierarchy) + A11y (keyboard + contrast) + Performance (lazy load, no layout shift) — all apply to every component.
2. 🎯 A form component needs: Frontend (controlled inputs), Design (error state styling), A11y (labels + aria-describedby), Security (client validation + server schema), Testing (given/when/then for validation).
3. 💡 A data table needs: Frontend (virtualization >50 rows), Design (tabular nums, sticky header), A11y (th scope, caption), Performance (pagination over rendering all rows).

### Building API Routes

4. ⚡ Architecture (thin handler, fat service) + Security (Zod validation, auth check, rate limit) + Testing (integration test per endpoint) + DevOps (monitoring, error tracking).
5. 🎯 An auth endpoint needs: Security (bcrypt, httpOnly cookies, CSRF, rate limit), Testing (test lockout, test session regeneration), Architecture (auth service behind interface).

### Shipping Features

6. 🎯 Architecture (mini-PRD first) → Frontend (implement) → Testing (TDD) → Security (review) → Performance (audit) → A11y (checklist) → DevOps (deploy with preview).
7. 💡 The Ultra shipping sequence: Plan → Build → Test → Review → Deploy → Verify. Never skip Review or Verify.

### Code Review

8. ⚡ When reviewing any PR, activate ALL modes that touch changed files — a CSS change still needs a11y and performance review.
9. 🎯 Review checklist: Does it work? Is it tested? Is it secure? Is it accessible? Is it performant? Is it maintainable?
10. 💡 Socratic review: "What would have to be true for this approach to be wrong?" — from grill-me.

---

## Section 14: Ultra Audit Workflow

When user requests a review, audit, or `/ultra-review`:

### Step 1: Detect Context
- List active modes based on file type, imports, directory, user intent
- Output: `Active modes: [list]`

### Step 2: Scan Against Rules
- Check every ⚡ critical rule in active modes — these are blockers
- Check 🎯 high-impact rules — these are strong recommendations
- Note 💡 insights where applicable

### Step 3: Report Findings
Format each finding as:
```
[P0/P1/P2] [Mode] Rule #N: [rule text]
  Found: [what you observed in the code]
  Fix: [specific actionable change]
```

Priority:
- **P0** (⚡ critical): Must fix before ship — security, a11y, data loss, crash
- **P1** (🎯 high-impact): Should fix — quality, performance, maintainability
- **P2** (💡 insight): Consider — optimization, polish, future-proofing

### Step 4: Score
- 0-100 quality score based on rules passed vs violated
- SHIP gate: no P0 findings, <3 P1 findings to ship

---

## Section 15: Platform Compatibility

Apple Ultra works across 20+ agent platforms. Activation method varies:

| Platform | Activation Method |
|----------|------------------|
| Claude Code | Auto-loaded from skills directory, trigger keywords |
| Cursor | Agent Skills auto-activation, or @apple-ultra |
| GitHub Copilot | .github/copilot-instructions.md or skills extension |
| Windsurf | .windsurf/rules/ directory |
| Gemini CLI | .gemini/skills/ or --skill flag |
| Cline | .cline/skills/ or .clinerules |
| Roo Code | .roo/rules/ or custom mode |
| VS Code | Copilot instructions or AI extension config |
| Zed | Agent rules or MCP integration |

Universal principle: if the platform reads SKILL.md with triggers, Apple Ultra works.

---


---

## Section 16: Agent-Reach Ultra-Mode

When you need real-world information, don't guess — reach for it.
Apple Ultra Skills integrates [Agent-Reach](https://github.com/Panniantong/Agent-Reach) as a zero-cost research layer.

**Install:**

```bash
pip install agent-reach && agent-reach install
```

See [references/agent-reach.md](./references/agent-reach.md) for channel reference.

### WHEN TO USE AGENT-REACH (activate automatically)

⚡ "What does X library's latest docs say?" → `agent-reach web [docs-url]`
⚡ "How do others solve this problem?" → `agent-reach reddit "topic query"`
⚡ "What's the latest on this framework?" → `agent-reach search "query"`
⚡ "Summarize this YouTube tutorial" → `agent-reach youtube [url]`
⚡ "Check this GitHub repo" → `agent-reach github owner/repo`
🎯 "Find recent discussions about X" → `agent-reach twitter "X query"`
🎯 "Get the RSS feed for this project's releases" → `agent-reach rss [feed-url]`

### RESEARCH PROTOCOL (always follow this order)

1. **GitHub first** — check official repo for issues, recent commits, README
2. **Official docs via web** — Jina Reader gives clean markdown from any URL
3. **Reddit/Twitter** — community sentiment and real-world usage problems
4. **YouTube** — only for tutorials when text sources are insufficient
5. **RSS** — for tracking ongoing projects (library releases, changelogs)

### RESEARCH-THEN-BUILD PATTERN

Before implementing any non-trivial pattern, run:

```bash
agent-reach github [framework]/[framework]    # check recent issues/PRs
agent-reach web [official-docs-url]           # get current API docs
agent-reach search "[pattern] best practices 2025"  # community consensus
```

Then synthesize findings into your implementation. Never code from memory
when the current state of a library may have changed.

### NEVER

⚡ Hallucinate library APIs. If uncertain, use Agent-Reach to verify.
⚡ Use deprecated patterns without checking current docs first.
🎯 Cite documentation from memory for fast-moving libraries (React, Next.js,
   Tailwind, TypeScript). These change across minor versions.

## Quick Commands

When the agent platform supports slash commands:

- `/ultra-review` — Run Apple Ultra audit on current file (all active modes)
- `/ultra-prd` — Generate structured mini-PRD from feature description
- `/ultra-test` — Generate TDD test scaffold for current module
- `/ultra-a11y` — Run WCAG 2.2 AA checklist on current component
- `/ultra-perf` — Audit current page for Core Web Vitals compliance
