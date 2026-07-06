# Search & Shopping Excellence — Master Plan

**Owner:** Dulith (CEO / founder evaluator). Dulith approves this plan at ≥9/10,
supervises every phase gate, reads failures through the CEO lens, orders architectural
fixes, and re-runs until the standard is met.

**Trigger:** Kapruka Agent Challenge brief (F8QYZ, 2 Jul 2026) + live benchmark of
[CareCart / Thili](https://kapruka-carecart-demo-one.vercel.app/) + Group Z everyday/electronics
failures + production repros (tool-markup leak, grocery→hamper mismatch, vague→no-search).

**North star:** Kira must feel like Sri Lanka's best shopping concierge — **search first,
refine in chat, checkout in two taps** — with CareCart-level UX polish and **better**
relevance, honesty, and depth (quick view, tracking, delivery intelligence) than any demo
competitor.

---

## Where we are vs where we're going

### Live benchmark (same queries, production Kira vs CareCart)

| Query | CareCart | Kira today | Target |
|-------|----------|------------|--------|
| Red roses under 5000 Colombo | Roses shown; **budget ignored** | 1 rose under budget | Budget enforced; 3–6 relevant picks |
| Groceries / rice / dhal (self) | **Flowers returned** | Grocery **hampers** LKR 11k+ | Rice/dhal SKUs or honest “Kapruka sells hampers, not loose rice” |
| Electronics under 3500 | Zero results | Weak but real SKUs | Relevant gadgets; junk filtered |
| Something cheap for amma | Clarifiers; weak results | **No search** (LLM chat only) | One clarifier max, then carousel |
| Birthday cake eggless Kandy | Context confusion | Honest empty (`cake`) | Retry `eggless` / bakery brands; alternatives |

### Scorecard (1–10)

| Dimension | Kira | CareCart | **Target** |
|-----------|-----:|---------:|-----------:|
| Gift search (flowers, cakes, hampers) | 7 | 6 | **9+** |
| Everyday / grocery self-shop | 3 | 2 | **8+** |
| Electronics / fashion / home | 4 | 2 | **8+** |
| Vague intent handling | 4 | 5 | **8+** |
| Budget / city respect | 7 | 4 | **9+** |
| Results UI (price, stock, refine) | 5 | 8 | **9+** |
| Honesty on empty / catalog limits | 8 | 4 | **9+** |
| Post-purchase (track, reorder, quick view) | 8 | 3 | **9+** (keep lead) |

**We win on:** honesty, budget, tracking, product detail, breakup/repair tone, MCP depth.  
**We lose on:** search routing consistency, non-gift category quality, results UX, UI localization.

---

## Root cause (why search feels “not good”)

Five architectural issues — not one bug:

1. **Fragmented routing** — 15+ ordered fast-paths + LLM prompt rules fight each other;
   same intent can search, ask, or chat with no clear rule (`search-fast-paths.ts`,
   `fast-paths.ts`, `kira-prompt.ts`).

2. **Dumb MCP keyword layer** — `q: "grocery"` returns gift hampers; cap-6 takes first
   MCP hits with no ranking (`extractProductsFromMcp`, `mcp-parsing.ts`).

3. **Partial category filters** — strict purity only for flowers/chocolate/cake/hampers;
   electronics/fashion/grocery pass through with family-safe only (`search.ts`).

4. **Anti-purity fallback** — when filters empty the carousel, route re-shows **unfiltered
   junk** (`app/api/chat/route.ts` LLM path + multi-category merge).

5. **No refinement UX** — no post-search chips, sort, or “view all”; user must retype
   (`QuickReplies.tsx` not wired to last search).

Regex whack-a-mole on individual phrases **will not** fix this. The fix is a **unified
search contract** + **expanded filters** + **results layer**.

---

## Principles (non-negotiable)

1. **Search-first for concrete nouns** — If the user names a product type (cake, roses,
   rice, phone, hamper), call MCP **before** asking “what kind?” Budget and city are
   optional refinements, not blockers.

2. **One brain, many handlers** — Replace overlapping gates with a single
   `resolveSearchIntent()` that outputs `{ action: 'search' | 'ask', query, lanes[], maxPrice, city, sort }`.
   Fast-paths become thin executors, not competing classifiers.

3. **Filter is a safety net, never bypassed** — Empty filter → retry with alternate query
   or honest empty + suggestions. **Never** `filterFamilySafeProducts(raw)` as fallback.

4. **Catalog honesty** — When Kapruka has no loose rice, say so and show closest matches
   (hampers) with explicit framing. Never pretend hampers = groceries.

5. **UX follows results** — Every `products` SSE event ships with: prices on cards,
   stock badge, delivery hint, and 3 contextual suggestion chips.

6. **Prove it with personas** — Every phase has a generated suite + ≥90% persona + ≥90%
   CEO lens gate before the next phase ships.

---

## Target architecture

```
User message
    │
    ▼
┌─────────────────────────────────────┐
│  resolveSearchIntent()              │  ← NEW unified layer (lib/kira/search-intent.ts)
│  script + language + cart context   │
└──────────────┬──────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
  SEARCH              ASK (max 1 Q)
     │                   │
     ▼                   └──► no carousel until concrete noun
┌─────────────────────────────────────┐
│  executeSearchPlan()                │  ← NEW (lib/kira/search-execute.ts)
│  • parallel MCP lanes (multi-term)  │
│  • max_price, sort, in_stock_only   │
│  • fetch 15 → rank → filter → top 6│
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  filterProductsForSearch()          │  ← EXTEND all verticals
│  + rankProductsForQuery()           │  ← NEW relevance scoring
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  SSE: products + suggestions +    │
│       delivery (if city known)      │
└──────────────┬──────────────────────┘
               ▼
     ProductCard / QuickView / CartFooter / Sidebar
```

**LLM agent loop** remains for: disjunction (“flowers or chocolates?”), multi-turn
negotiation, checkout, tracking — not for simple product lookup.

---

## Phase roadmap

Each phase ends with a **Dulith gate** (persona ≥90%, CEO ≥90%, live repro checklist).
Phases are sequential; do not skip gates.

### Phase 0 — Baseline & plan gate

**Deliverables**

- This document approved ≥9/10: `node scripts/dulith-plan-review.mjs --domain search-excellence`
- Freeze benchmark matrix (10 queries × en/si/Singlish) in `scripts/search-benchmark.mjs`
- Record baseline scores in `test-results/search-excellence/baseline.json`

**Live repro matrix (run on production after every phase)**

| ID | Query | Must pass |
|----|-------|-----------|
| B01 | `show me red roses under 5000 colombo` | ≥1 product ≤5000; no junk |
| B02 | `I need rice and dhal for myself, deliver Colombo` | rice/dhal SKUs OR honest hamper pivot |
| B03 | `show me electronics under 3500 — buying for myself` | ≥2 relevant; no random junk |
| B04 | `something cheap for amma colombo` | ≤1 clarifier, then carousel |
| B05 | `birthday cake eggless kandy tomorrow` | search + delivery OR honest empty + alt |
| B06 | `show me` → `oke` | no tool markup leak |
| B07 | `machang mata roses ona colombo` | English reply, products |
| B08 | Sinhala Unicode flowers query | Sinhala script reply + products |
| B09 | `flowers and chocolates under 4000` | both lanes; no flower-themed cakes |
| B10 | `track order KP12345` | timeline; no search carousel |

---

### Phase 1 — Search brain (P0)

**Goal:** One intent resolver; search-first for concrete nouns; kill junk fallback.

**Work**

| Task | Files | Acceptance |
|------|-------|------------|
| Add `resolveSearchIntent()` | `lib/kira/search-intent.ts` (new) | Unit tests for 50 intent fixtures |
| Add `executeSearchPlan()` — parallel lanes, fetch 15, rank top 6 | `lib/kira/search-execute.ts` (new) | B01–B05 improve on benchmark |
| Multi-term grocery: `rice`, `dhal`, `red rice` not just `grocery` | `search-execute.ts` | B02 passes or honest pivot |
| Remove empty-filter junk fallback | `app/api/chat/route.ts`, `search-fast-paths.ts` | Group T junk rate ↓ |
| Add `rankProductsForQuery()` — price fit, name match, budget | `lib/kira/search.ts` | B01 budget compliance 100% |
| Migrate fast-paths to call resolver (thin wrappers) | `search-fast-paths.ts`, `fast-paths.ts` | No behaviour regression on S/T |

**QA gate — reuse + extend existing groups**

- Group S (search routing) ≥90% / ≥90% CEO
- Group T (category purity) ≥90% / ≥90% CEO
- Group V (vague intent) ≥90% / ≥90% CEO
- Benchmark B01–B05 all green

**Exit criteria:** Phase 1 gate in `test-results/search-excellence/phase-1.json`

---

### Phase 2 — Category coverage (P0)

**Goal:** Gift lanes stay pure; **electronics, grocery, fashion, home** get the same treatment as flowers.

**Work**

| Vertical | Relevance terms | Junk reject | Notes |
|----------|---------------|-------------|-------|
| electronics | phone, charger, gadget, scale… | vaporizer unless query says mosquito | B03 |
| grocery | rice, dhal, flour, essentials | **reject hampers** unless user said hamper | B02 |
| clothing | shirt, dress, saree… | accessories, pens | Group Z self_cat |
| home | home essentials, cleaning… | random gift SKUs | everyday shopper |

**Work**

- Extend `CATEGORY_RELEVANCE_TERMS` + `CATEGORY_IRRELEVANCE_TERMS` in `search.ts`
- Eggless / dietary: pass attribute to MCP `q` + name filter (`eggless`, `sugar free`)
- Bakery brand lane: expand `BAKERY_BRANDS` fast-path for cake failures (B05)

**QA gate — new Group AA (Search Excellence), 400 cases**

Generator: `scripts/generate-search-excellence.mjs` → Group **AA**

| Family | Cases | Checks |
|--------|------:|--------|
| Everyday grocery self-shop | 80 | productsOrHonestEmpty, noForcedGiftTone |
| Electronics / home self-shop | 60 | category purity, budget |
| Gift + budget + city | 60 | budget respected |
| Vague → clarify → search | 40 | max 1 ask before carousel |
| Multi-category combo | 40 | S routing |
| Zero-result + retry | 40 | honest empty OR alt carousel |
| Sinhala / Singlish search | 40 | replyLanguage + products |
| CareCart parity traps (budget, wrong category) | 40 | must not regress |

Run: `npm run test:search-excellence` (to be wired) — **≥90% / ≥90%** on all 400.

**Exit criteria:** `test-results/search-excellence/phase-2.json`

---

### Phase 3 — Results UX (P1) — match & beat CareCart

**Goal:** Shopping feels finished, not like a chat experiment.

**Work**

| Feature | CareCart has | Kira target | Files |
|---------|-------------|-------------|-------|
| Price on every card | ✓ | ✓ | `ProductCard.tsx` |
| In-stock badge | ✓ | ✓ + delivery date badge | `ProductCard.tsx` |
| Add → toast + “Added ✓” | ✓ | ✓ | `KiraExperience.tsx`, `CartContext` |
| Sticky cart footer | ✓ | ✓ | new `CartFooter.tsx` in layout |
| “Kira’s plan” sidebar | ✓ | ✓ + delivery quote | new `KiraSidebar.tsx` |
| Post-search chips | ✓ | ✓ | SSE `suggestions` + `QuickReplies.tsx` |
| View all matches | ✓ | ✓ | expand grid or `/shop/search-results` |
| Product quick view | ✗ | ✓ (keep) | already have — promote tap target |

**SSE contract addition**

```typescript
// After products event:
{ t: "suggestions", v: ["Show cheaper", "Add chocolates", "Deliver tomorrow"] }
```

**Exit criteria:** Manual UX checklist (10 flows) + CEO lens ≥9/10 on 20 scripted demos;
benchmark B01–B10 unchanged or improved.

---

### Phase 4 — Language & everyday shopper (P1)

**Goal:** Challenge brief: everyday shopper is **primary user**; Sinhala/Tanglish stand out.

**Work**

- Auto-detect script on first message → set `language` + **localize UI chrome**
  (`KiraExperience.tsx`, extend `localization.ts` to UI strings)
- Self-shop path always searches for concrete nouns in all 5 modes (Group Z everyday 90 cases)
- Catalog honesty copy for grocery: `groceryHamperPivot` localized string when only hampers exist
- Complete Group Z 2500 gates (5×500) — prerequisite for “done”

**Exit criteria:** Group Z aggregate APPROVED in `test-results/dulith-multilingual/summary.json`

---

### Phase 5 — Agent loop slim-down (P2)

**Goal:** LLM handles conversation; **not** simple product lookup.

**Work**

- `shouldBypassSearchFastPath()` — already planned in SEARCH-ROUTING-PLAN; enforce after Phase 1
- Reduce prompt token cost: move search rules into code (resolver), keep prompt for personality + checkout
- Tool-markup sanitizer + recovery (shipped) — add to B06 regression forever
- 8B fallback: never show carousel without tool proof

**Exit criteria:** Group U (context bleed) + Group V ≥90%; Groq cost per search ↓ 30% (measure via logs)

---

### Phase 6 — Beyond CareCart (P2) — moat features

Features CareCart lacks; keep and polish:

| Feature | Why it matters |
|---------|----------------|
| Product quick view + variants | Confidence before add |
| Order tracker timeline | Post-purchase trust |
| Breakup hand-deliver flow | Challenge email story |
| Delivery quote per request | Logistics transparency |
| One-tap reorder (Group X) | Habit loop Dulith #1 ask |
| Cart edit via chat | “Remove roses”, “make it 2” — fast-path |

**Exit criteria:** Groups X + Y remain ≥90%; CEO demo script (15 min) recorded and scored ≥9/10.

---

### Phase 7 — Final Dulith gate & production sign-off

**Deliverables**

```bash
npm run test:search-excellence        # Group AA 400
npm run test:dulith-qa                # S T U V W X
npm run test:z-2500:supervisor:full   # Z 2500 (if not already green)
npm run test:search-benchmark         # B01–B10 production
npm run test:dulith-gate              # aggregate verdict
```

**Verdict file:** `test-results/search-excellence/VERDICT.json`

```json
{
  "verdict": "APPROVED — Search & shopping excellence standard met.",
  "benchmark": { "passed": 10, "total": 10 },
  "groups": { "AA": "94%", "S": "…", "Z": "…" },
  "ceoAggregate": "96%",
  "carecartParity": true,
  "carecartExceeded": ["relevance", "budget", "tracking", "quickView", "honesty"]
}
```

---

## Dulith operating loop (every phase)

```
Phase 0  Plan gate       dulith-plan-review --domain search-excellence  (≥9/10)
Phase 1  Implement       search-intent + execute + remove junk fallback
Phase 2  Implement       category verticals + Group AA generator
Phase 3  Implement       results UX (footer, sidebar, chips)
Phase 4  Implement       language UI + Group Z completion
Phase 5  Implement       slim agent loop
Phase 6  Polish          moat features
Phase 7  Final gate      all suites + benchmark + VERDICT.json
```

Within each phase:

1. Run relevant persona group + benchmark matrix
2. Cluster failures by reason (routing / MCP / filter / UX / copy)
3. Fix **highest-impact cluster architecturally**
4. Re-run failed IDs → full group re-run
5. Dulith CEO lens on failures until ≥90%
6. **Do not start next phase until current gate is green**

---

## QA inventory (how this plan uses existing work)

| Group | Cases | This plan |
|-------|------:|-----------|
| S — search routing | 200 | Phase 1 gate |
| T — category purity | ~120 | Phase 1–2 gate |
| U — context bleed | ~80 | Phase 5 gate |
| V — vague intent | ~60 | Phase 1–2 gate |
| W — repair flow | ~60 | No regression |
| X — reorder | ~60 | Phase 6 |
| Y — breakup/repair | 500 | No regression |
| Z — multilingual | 2500 | Phase 4 gate |
| **AA — search excellence** | **400** | **Phase 2 gate (new)** |

Register domain `search-excellence` in `scripts/dulith-domains.mjs` when generator lands.

---

## Success metrics (measurable)

| Metric | Baseline (Jul 2026) | Phase 1 | Phase 3 | Final |
|--------|---------------------|---------|---------|-------|
| Benchmark B01–B10 pass rate | ~6/10 | 8/10 | 9/10 | **10/10** |
| Group AA persona pass | — | — | — | **≥90%** |
| Group Z everyday (90×5) pass | ~70% | 85% | 90% | **≥90%** |
| Junk SKU in carousel (T+AA) | ~15% fail | ≤5% | ≤2% | **≤2%** |
| “Ask instead of search” on concrete noun | ~25% | ≤5% | ≤2% | **≤2%** |
| Tool markup leaks | fixed | 0 | 0 | **0** |
| CEO lens aggregate (all groups) | ~85% | 90% | 92% | **≥93%** |
| Time-to-first-carousel (concrete query) | 3–8s | ≤4s | ≤3s | **≤3s** |

---

## File map (planned / touched)

| File | Phase | Role |
|------|-------|------|
| `lib/kira/search-intent.ts` | 1 | Unified intent resolver |
| `lib/kira/search-execute.ts` | 1 | MCP plan execution + ranking |
| `lib/kira/search.ts` | 1–2 | Filters, ranking, category terms |
| `lib/kira/search-fast-paths.ts` | 1 | Thin executors (shrink over time) |
| `lib/kira/fast-paths.ts` | 1 | Pre-search deterministic only |
| `app/api/chat/route.ts` | 1, 5 | Remove junk fallback; suggestions SSE |
| `app/components/ProductCard.tsx` | 3 | Price, stock, added state |
| `app/components/CartFooter.tsx` | 3 | Sticky checkout bar |
| `app/components/KiraSidebar.tsx` | 3 | Mission + progress |
| `app/components/QuickReplies.tsx` | 3 | Post-search chips |
| `scripts/generate-search-excellence.mjs` | 2 | Group AA |
| `scripts/search-benchmark.mjs` | 0 | B01–B10 automation |
| `docs/SEARCH-EXCELLENCE-MASTER-PLAN.md` | 0 | This document |

Sub-plans remain authoritative for detail:

- `docs/SEARCH-ROUTING-PLAN.md` — multi-category combos
- `docs/CATEGORY-PURITY-PLAN.md` — gift lane junk
- `docs/VAGUE-INTENT-PLAN.md` — clarify vs carousel
- `docs/CONTEXT-BLEED-PLAN.md` — follow-up category
- `docs/MULTILINGUAL-2500-PLAN.md` — Group Z

---

## Explicit non-goals

- Replacing Kapruka MCP with a custom search index (out of scope for challenge window)
- Voice TTS on every message (optional demo nice-to-have, not Phase 3 blocker)
- Scraping Amazon/Global Shop (already “coming soon”)
- Per-phrase regex for every Singlish variant (language-mode detection handles this)
- Lowering Dulith gate below 90% to greenwash a phase

---

## Ops constraints

- MCP: 60 req/min/IP — parallel lanes must cap at 3 queries per turn
- Groq free tier: persona suites at `--concurrency 1`; production benchmark uses live API
- Production deploy required for benchmark B01–B10 (Vercel env has valid Groq keys)
- Do not poll MCP in loops; retry alternate **query terms**, not same call

---

## npm scripts (to wire as phases land)

```bash
npm run test:search-benchmark          # B01–B10 against KIRA_API_URL
npm run test:search-excellence:gen     # generate Group AA
npm run test:search-excellence         # full AA + CEO lens
npm run test:search-excellence:smoke   # 40-case smoke
npm run test:search-excellence:gate    # phases 1–7 aggregate verifier
```

---

## First sprint (start here)

Week-equivalent work packaged as **Phase 1 sprint** — smallest path to visible improvement:

1. `resolveSearchIntent()` + `executeSearchPlan()` with multi-term grocery
2. Remove junk fallback in `route.ts`
3. Electronics + grocery `CATEGORY_RELEVANCE_TERMS`
4. Wire `suggestions` SSE + 3 chips after products
5. Run benchmark B01–B05 + Group T smoke (25 cases)
6. Dulith review → iterate until benchmark ≥8/10

After Phase 1 sprint is green, proceed to full Phase 2 (Group AA 400) and Phase 3 UX.

---

*Because this plan targets 9+/10 founder standard, Dulith will challenge every phase
with live repro, edge cases, and CEO lens before sign-off. Excitement must be earned
with evidence — not claimed.*
