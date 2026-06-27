# Kira Challenge Scorecard

Living scorecard for the Agent `/` and Shop `/shop` loop. Scores are evidence-based; unverified gates stay blocked or failing until proven.

## Loop 0 — Bootstrap / baseline started

### Agent scores

| Gate | Score / status | Verdict | Evidence / P0 list |
|---|---:|---|---|
| Official rubric | TBD / 100 | Pending baseline | Run judge script, core/persona tests, Playwright, live review. |
| Design review | TBD / 100 | Pending baseline | Scope: KiraExperience, ProductCard, ProductQuickView, CheckoutModal, CommerceRail, ChatMessage, QuickReplies, ThinkingBlock, CityPicker, OrderTracker, FloatingCartButton. |
| Web quality | TBD | Pending baseline | Need local and live `/` audits. |
| Brand voice | TBD | Pending baseline | Scope: `lib/kira-prompt.ts` and chat microcopy. |
| CTO/security | TBD | Pending baseline | Scope: `app/api/chat/route.ts`, `lib/mcp-*.ts`, checkout. |
| TDD/automated | TBD | Pending baseline | Commands queued. |

### Shop scores

| Gate | Score / status | Verdict | Evidence / P0 list |
|---|---:|---|---|
| Internal rubric | TBD / 100 | Pending baseline | Need shop browse/product/mobile/Kira handoff review. |
| Design review | TBD / 100 | Pending baseline | Scope: `app/shop/**`, `app/product/[id]/**`, `app/components/store/**`. |
| Visual system | TBD | Pending baseline | Must match agent tokens, type, glass, motion. |
| Component discovery | TBD | Pending baseline | Product imagery/cards/rails need review. |
| Web quality | TBD | Pending baseline | Need `/shop` and `/product/[id]` audits. |
| Brand voice | TBD | Pending baseline | Scope: shop copy, CTAs, KiraBand, empty states. |
| CTO | TBD | Pending baseline | Scope: `lib/catalog.ts`, store APIs, seed catalog. |
| Automated | Missing | FIX | No dedicated shop Playwright spec yet. |

### Shared / CEO

| Gate | Status | Evidence / blockers |
|---|---|---|
| Dependencies | Passed | `npm install` completed. npm audit reports 3 vulnerabilities (2 moderate, 1 high); needs triage before final ship. |
| Apple Ultra skills | Passed with Option B | Option A failed under `sh` because `pipefail` was unsupported. Option B `npx skills add Cookie-Cat21/apple-ultra-skills -y` installed `apple-ultra-skills` to `.agents/skills/apple-ultra-skills`. |
| Kapruka MCP config | Added | `.cursor/mcp.json` created for `https://mcp.kapruka.com/mcp`. |
| Next.js docs | Read | Next 16 upgrade, route handlers, page props, metadata, image, Playwright docs read. Key notes captured in `.ultra.md`. |
| Cross-surface parity | Pending baseline | `/` and `/shop` must feel like one product. |
| Dulith path 1 — Agent | Pending baseline | Run after local smoke. |
| Dulith path 2 — Shop | Pending baseline | Run after local smoke. |

### Blockers for next loop

1. Run baseline `npm run lint && npm run build`.
2. Run MCP, judge dry-run, core, persona, and Playwright suites.
3. Add dedicated shop E2E coverage.
4. Build shop browse gaps: rush/sale/brand/event surfaces, richer product detail, stronger mobile/Kira handoff.
5. Triage npm audit high vulnerability.

## Loop 1 — Local gates green, shop parity lifted

### Agent scores

| Gate | Score / status | Verdict | Evidence / P0 list |
|---|---:|---|---|
| Official rubric | 95 / 100 local | PASS locally, live blocked | Experience 29/30, Visual 19/20, Personality 15/15, Usefulness 15/15, Completeness 14/15, Creativity 4/5. Blocker: production URL not available from this VM. |
| Design review | 96 / 100 local | PASS | Manual `/` review confirms same dark gradient, typography, yellow/purple accents, product cards, and Browse store bridge as shop. 0 Critical, 0 High. |
| Web quality | 89 Perf / 100 A11y / 100 SEO local prod | PASS local, live blocked | Local production Lighthouse on `http://localhost:3108/`: Performance 89, Accessibility 100, Best Practices 100, SEO 100, LCP 3.8s. Live preview remains SSO-protected. |
| Brand voice | 95 / 100 local | PASS | Prompt remains lean; deterministic repair/trust/jailbreak/local-language flows pass. Sinhala/Tamil fast paths pass. |
| CTO/security | 94 / 100 local | PASS with non-P0 notes | MCP probe green. Checkout state-machine persona regressions fixed. `npm audit fix` cleared high `hono` advisory; 2 moderate `postcss` advisories remain inside Next dependency with only `--force` breaking suggestion. |
| TDD/automated | 100% local | PASS | `judge-dry-run`: 10/10. Core: 68/68. Persona: 120/120. Playwright: 35/35. |

### Agent blockers / fixes from this loop

- Fixed checkout field-collection ordering in `app/api/chat/route.ts`: explicit order/delivery one-liners now ask for missing phone/address instead of misreading dates as budgets and searching.
- Fixed rush/same-day date in `app/api/chat/route.ts`: uses Colombo-local `getColomboTodayIso()` instead of UTC `new Date().toISOString()`.

### Shop scores

| Gate | Score / status | Verdict | Evidence / P0 list |
|---|---:|---|---|
| Internal rubric | 95 / 100 local | PASS locally, live blocked | Visual craft 24/25, Browse UX 24/25, Product pages 19/20, Mobile polish 14/15, Agent integration 14/15. |
| Design review | 96 / 100 local | PASS | New fast lanes, real catalog imagery, product trust/payment/cross-sell, Kira dock handoff. 0 Critical, 0 High locally. |
| Visual system | 95 / 100 | PASS | Agent/shop share dark canvas, Kapruka purple/yellow, display type, glass cards/chips, rounded buttons, shared cart. |
| Component discovery | 95 / 100 | PASS | Store cards now use real MCP images where available; category/product/detail/cross-sell cards match agent quality. |
| Web quality | Shop 86 Perf / Product 87 Perf local prod | PASS local, live blocked | Local production Lighthouse: `/shop` Performance 86, A11y 100, BP 100, SEO 100, LCP 4.2s; `/product/CAKE00KA001990` Performance 87, A11y 100, BP 100, SEO 100, LCP 4.1s. Live preview remains SSO-protected. |
| Brand voice | 94 / 100 | PASS | Fast lanes/KiraBand copy uses Kira-style Sri Lankan shopping language, not generic ecommerce. |
| CTO | 95 / 100 | PASS | `lib/catalog.ts` adds rush/sale/related rails with DB+seed fallback; `scripts/sync-catalog.mjs` refreshes and filters seed relevance; store APIs remain green. |
| Automated | 4/4 shop + 35/35 full | PASS | Added `tests/e2e/shop.spec.ts`; full Playwright suite now covers agent + shop. |

### Shop blockers / fixes from this loop

- Added `StoreFastLanes` for Rush delivery, On sale, Bakery brands, and Events & occasions.
- Added rush/sale rails and refreshed `data/seed-catalog.json` from Kapruka MCP with real images.
- Added relevance filters in `scripts/sync-catalog.mjs`; removed observed flower category noise such as toy/puzzle results.
- Added product detail variants/add-ons rendering, secure payment trust card, and related cross-sell carousel.
- Added shop Playwright E2E coverage for `/shop`, category, product detail, checkout handoff, Kira handoff, and mobile.

### Shared / CEO

| Gate | Status | Evidence / blockers |
|---|---|---|
| Lint/build | PASS | `npm run lint && npm run build` passes with 0 warnings after generated Playwright artifacts were excluded from ESLint. |
| MCP | PASS | `node scripts/test-mcp.mjs` connected and verified all 7 tools, product search, city alias, delivery, perishable warning. |
| Full Playwright | PASS | 35/35 after installing Playwright Chromium. |
| Manual GUI review | PASS local | Computer-use review passed `/shop`, `/shop/cakes`, `/product`, checkout fields, Ask Kira dock, mobile viewport, and `/` consistency. Screenshots captured in `/tmp/computer-use/*.webp`. Follow-up confirmed real images; one flower noise item was fixed by catalog filtering. |
| Dulith path 1 — Agent | 9.2 / 10 local | Would impress: real MCP, checkout, tracking, local language, repair-gift personality. Needs live URL proof for final 9+/10 validation. |
| Dulith path 2 — Shop | 9.1 / 10 local | Would impress: website tabs reimagined, real imagery, product detail depth, Kira handoff, shared bag. Needs live URL proof and Lighthouse for final 9+/10 validation. |
| Cross-surface parity | PASS local | Same canvas/tokens/type/motion/cart/Kira voice across `/` and `/shop`. |
| Deployment | PREVIEW DEPLOYED, LIVE ACCESS BLOCKED | GitHub deployments show Vercel preview for latest commit `9f9aa2e`: `https://kira-389x3z2zw-cookie-cat21s-projects.vercel.app`. `/api/health` returns HTTP 302 to Vercel SSO, so public judge/live web-quality gates cannot run against it. Latest production deployment is also SSO-protected. Vercel CLI is unauthenticated and opened device login, then was stopped. Need unprotected preview, production promotion, or Vercel auth. |
| Pull request | Draft opened | https://github.com/Cookie-Cat21/Kira/pull/74 |

### Automated evidence

```text
npm run lint                       PASS
npm run build                      PASS
node scripts/test-mcp.mjs          PASS
judge-dry-run                      10/10 PASS
node scripts/run-tests.mjs         68/68 PASS
node scripts/test-personas.mjs --concurrency 1 120/120 PASS
npx playwright test                35/35 PASS
npx playwright test tests/e2e/shop.spec.ts 4/4 PASS
local production Lighthouse /      Perf 89 / A11y 100 / BP 100 / SEO 100
local production Lighthouse /shop  Perf 86 / A11y 100 / BP 100 / SEO 100
local production Lighthouse /product/CAKE00KA001990 Perf 87 / A11y 100 / BP 100 / SEO 100
npm audit --audit-level=moderate   BLOCKED: 2 moderate advisories in Next's nested postcss; non-breaking audit fix already applied.
```

### Blockers for next loop

1. Current Vercel preview for HEAD is SSO-protected (`/api/health` redirects to `https://vercel.com/sso-api?...`), so public judge dry-run and Lighthouse gates remain blocked.
2. Run live `KIRA_API_URL=https://<live>/api/chat node scripts/judge-dry-run.mjs` once deploy is available.
3. Run live `/`, `/shop`, and `/product/[id]` web-quality/Lighthouse checks once deploy is available.
4. Native-speaker Sinhala/Tamil copy review still recommended before final submission.
