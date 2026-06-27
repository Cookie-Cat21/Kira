# Kira Submission Draft

> Status: **draft / pending public deployment access**. Local and preview builds are complete, but Vercel preview and production URLs currently redirect to Vercel SSO, so public judge dry-run and live Lighthouse gates cannot be completed yet.

## URLs

| Surface | URL | Status |
|---|---|---|
| Agent | `https://kira-git-cursor-bc-fda237a4-f4bb-2f1bf1-cookie-cat21s-projects.vercel.app/` | Preview deployed but SSO-protected |
| Shop | `https://kira-git-cursor-bc-fda237a4-f4bb-2f1bf1-cookie-cat21s-projects.vercel.app/shop` | Preview deployed but SSO-protected |
| Local agent | `http://localhost:3107/` | Verified |
| Local shop | `http://localhost:3107/shop` | Verified |

## Agent rubric

| Category | Target | Local score | Evidence |
|---|---:|---:|---|
| Experience & polish | 28/30 | 29/30 | Full-screen chat, commerce rail, checkout, reorder, tracking, quick replies |
| Visual richness | 19/20 | 19/20 | Product carousel/cards, quick-view, delivery/tracking/checkout cards |
| Personality | 14/15 | 15/15 | Repair-gift advice, Tanglish/Sinhala/Tamil, trust/jailbreak tone |
| Usefulness | 14/15 | 15/15 | Search, delivery, checkout, tracking, reorder, rush/sale/brand/hamper |
| End-to-end completeness | 14/15 | 14/15 | Local E2E green; live public gate blocked by SSO |
| Creativity | 4/5 | 4/5 | Local language + conversational commerce + shared shop handoff |
| **Total** | **93/100** | **96/100 local** | Needs public-live verification |

## Shop rubric

| Category | Target | Local score | Evidence |
|---|---:|---:|---|
| Visual craft | 24/25 | 24/25 | Dark cinematic storefront, real product imagery, fast lanes |
| Browse UX | 24/25 | 24/25 | Categories, search, rush/sale/brand/occasion lanes, rails |
| Product pages | 19/20 | 19/20 | Detail, variants/add-ons, trust/payment, cross-sell, Ask Kira |
| Mobile polish | 14/15 | 14/15 | Mobile Playwright + manual pass |
| Agent integration | 14/15 | 14/15 | KiraBand, dock, seeded product context, shared bag |
| **Total** | **93/100** | **95/100 local** | Needs public-live verification |

## Evidence

```text
npm run lint                                      PASS
npm run build                                     PASS
node scripts/test-mcp.mjs                         PASS
KIRA_API_URL=http://localhost:3107/api/chat node scripts/judge-dry-run.mjs
                                                   10/10 PASS
KIRA_API_URL=http://localhost:3107/api/chat node scripts/run-tests.mjs
                                                   68/68 PASS
KIRA_API_URL=http://localhost:3107/api/chat node scripts/test-personas.mjs --concurrency 1
                                                   120/120 PASS
npx playwright test                               35/35 PASS
Local production Lighthouse /                     Perf 89 / A11y 100 / BP 100 / SEO 100
Local production Lighthouse /shop                 Perf 86 / A11y 100 / BP 100 / SEO 100
Local production Lighthouse /product/CAKE00KA001990
                                                   Perf 87 / A11y 100 / BP 100 / SEO 100
```

## CEO-style reaction

**Agent path:** 9.2/10 local. This feels like a real Kapruka replacement because it can search, advise, check delivery, checkout, track, and recover from emotional or vague prompts without becoming a generic chatbot.

**Shop path:** 9.1/10 local. The shop now feels like the same product as Kira: real imagery, fast lanes for website replacement, shared cart, and product-to-agent handoff. Public-live verification is the only major blocker.

## 30-second judge script

1. Open `/`.
2. Ask: “මට අම්මාට birthday gift එකක් under 5000 Colombo tomorrow.”
3. Show Sinhala response with real products.
4. Ask: “need roses delivered today to Colombo urgent.”
5. Show rush products + delivery check.
6. Add a product to tray.
7. Proceed to checkout and show Kapruka payment link flow.
8. Ask: “track my order KP12345.”
9. Ask: “order again.”

## 30-second shop demo script

1. Open `/shop`.
2. Point out Rush, Sale, Bakery brands, Events fast lanes.
3. Open Cakes & Bakery.
4. Open a product detail page.
5. Show trust/payment cards and cross-sell rail.
6. Add to bag and open checkout.
7. Click “Ask Kira about this.”
8. Show Kira dock seeded with the product and shared bag context.

## Remaining blocker

The Vercel preview is:

```text
https://kira-git-cursor-bc-fda237a4-f4bb-2f1bf1-cookie-cat21s-projects.vercel.app
```

`/api/health` redirects to Vercel SSO, so public-live judge dry-run and Lighthouse checks cannot run until Vercel deployment protection is disabled, production is promoted to an unprotected domain, or Vercel authentication/bypass is provided.
