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
