# Kira Excellence — Master Plan

**North star:** Kira is Sri Lanka's best shopping concierge — **search first, refine in chat,
checkout in two taps** — with [CareCart](https://kapruka-carecart-demo-one.vercel.app/) UX polish
and **better** relevance, honesty, and post-purchase depth than any demo competitor.

**Owner:** Dulith (CEO / founder evaluator). Every phase ships only after ≥90% persona pass +
≥90% CEO lens on its gate suite. Plans score ≥9/10 before implementation starts.

**Benchmark:** CareCart (Thili) is the UX bar. Kira must **match** cart footer, sidebar, chips,
and card polish — and **beat** CareCart on budget enforcement, category honesty, tracking, and
product depth.

---

## Where we are today (Jul 2026)

### Strengths (keep and polish)

| Capability | Status |
|------------|--------|
| Breakup / hand-deliver flow | Group Y **500/500** green |
| Budget enforcement (flowers) | Beats CareCart on B01 |
| Order tracking + quick view | CareCart lacks these |
| Delivery quotes + checkout | Working via MCP |
| Tool-markup sanitizer | Shipped; B06 regression |
| Honest empty states | Strong on edge queries (B05) |

### Gaps (why search feels “not good”)

| Gap | Symptom | Root cause |
|-----|---------|------------|
| Routing inconsistency | “Cheap for amma” → chat, no carousel | 15+ competing fast-paths |
| Grocery self-shop | Hampers instead of rice/dhal | MCP `q: "grocery"` + no multi-term |
| Electronics | Weak but real vs CareCart zero | Partial category filters |
| Junk in carousel | Pens, cards, wrong-category SKUs | Anti-purity fallback when filter empties |
| Results UX | Cards without sticky cart / chips | No post-search refinement layer |
| Multilingual UI | Sinhala input → English unless selector set | Client `language` defaults `"en"` |
| Group Z 2500 | en green; si/ta/Singlish/Tanglish incomplete | Language contract + everyday routing |

Five architectural issues — **not** one bug. Regex whack-a-mole will not fix this.

---

## Scorecard: Kira vs CareCart vs Target

| Dimension | Kira | CareCart | **Target** |
|-----------|-----:|---------:|-----------:|
| Gift search (flowers, cakes, hampers) | 7 | 6 | **9+** |
| Everyday / grocery self-shop | 3 | 2 | **8+** |
| Electronics / fashion / home | 4 | 2 | **8+** |
| Vague intent handling | 4 | 5 | **8+** |
| Budget / city respect | 7 | 4 | **9+** |
| Results UI (price, stock, refine) | 5 | 8 | **9+** |
| Honesty on empty / catalog limits | 8 | 4 | **9+** |
| Post-purchase (track, reorder, quick view) | 8 | 3 | **9+** |

**Win vector:** relevance + honesty + depth. **Close vector:** UX polish + routing consistency.

---

## Principles (non-negotiable)

1. **Search-first for concrete nouns** — cake, roses, rice, phone → MCP before “what kind?”
2. **One brain** — `resolveSearchIntent()` decides search vs ask; fast-paths become thin executors
3. **Filter never bypassed** — empty filter → retry query or honest empty; never unfiltered junk
4. **Catalog honesty** — hampers ≠ loose rice; say so and frame alternatives explicitly
5. **UX follows results** — every carousel ships price, stock, delivery hint, 3 suggestion chips
6. **Prove with personas** — no phase ships without its automated gate at ≥90% / ≥90%

---

## Target architecture

```
User message
    │
    ▼
resolveSearchIntent()          ← lib/kira/search-intent.ts (NEW)
    │
    ├── SEARCH ──► executeSearchPlan()     ← lib/kira/search-execute.ts (NEW)
    │                    │
    │                    ▼
    │              filter + rank → top 6
    │                    │
    │                    ▼
    │              SSE: products + suggestions + delivery
    │
    └── ASK (max 1 Q) ──► no carousel until concrete noun

LLM agent loop: disjunction, negotiation, checkout, tracking — NOT simple lookup
```

Full detail: [`docs/SEARCH-EXCELLENCE-MASTER-PLAN.md`](./SEARCH-EXCELLENCE-MASTER-PLAN.md)

---

## Phase roadmap

Phases are **sequential**. Do not skip Dulith gates.

```mermaid
flowchart LR
  P0[Phase 0\nBaseline] --> P1[Phase 1\nSearch brain]
  P1 --> P2[Phase 2\nCategory coverage]
  P2 --> P3[Phase 3\nResults UX]
  P3 --> P4[Phase 4\nLanguage + Z]
  P4 --> P5[Phase 5\nSlim agent loop]
  P5 --> P6[Phase 6\nMoat features]
  P6 --> P7[Phase 7\nFinal gate]
```

### Phase 0 — Baseline & plan gate

| Deliverable | Detail |
|-------------|--------|
| Plan approval | `node scripts/dulith-plan-review.mjs --domain search-excellence` ≥9/10 |
| Benchmark matrix | `scripts/search-benchmark.mjs` — B01–B10 on production |
| Baseline record | `test-results/search-excellence/baseline.json` |

**Live repro matrix (run after every phase on production):**

| ID | Query | Must pass |
|----|-------|-----------|
| B01 | red roses under 5000 colombo | ≥1 ≤5000; no junk |
| B02 | rice and dhal for myself, Colombo | SKUs OR honest hamper pivot |
| B03 | electronics under 3500, self | ≥2 relevant; no junk |
| B04 | something cheap for amma colombo | ≤1 clarifier, then carousel |
| B05 | birthday cake eggless kandy tomorrow | search + delivery OR honest alt |
| B06 | show me → oke | no tool markup leak |
| B07 | machang mata roses ona colombo | English reply + products |
| B08 | Sinhala Unicode flowers | Sinhala reply + products |
| B09 | flowers and chocolates under 4000 | both lanes; no flower cakes |
| B10 | track order KP12345 | timeline; no carousel |

---

### Phase 1 — Search brain (P0) ← **start here**

**Goal:** Unified intent resolver; search-first; kill junk fallback.

| Task | Files |
|------|-------|
| `resolveSearchIntent()` | `lib/kira/search-intent.ts` |
| `executeSearchPlan()` — parallel lanes, fetch 15, rank top 6 | `lib/kira/search-execute.ts` |
| Multi-term grocery (`rice`, `dhal`, not just `grocery`) | `search-execute.ts` |
| Remove empty-filter junk fallback | `route.ts`, `search-fast-paths.ts` |
| `rankProductsForQuery()` | `lib/kira/search.ts` |
| Thin fast-path wrappers | `search-fast-paths.ts`, `fast-paths.ts` |

**Gate:** Groups S, T, V ≥90% / ≥90%; B01–B05 green → `test-results/search-excellence/phase-1.json`

---

### Phase 2 — Category coverage (P0)

**Goal:** Gift lanes stay pure; electronics, grocery, fashion, home get same treatment as flowers.

| Vertical | Key rule |
|----------|----------|
| electronics | Reject vaporizers unless mosquito query |
| grocery | Reject hampers unless user said hamper |
| clothing / home | Category purity for self-shop |

**New suite:** Group **AA** — 400 cases via `scripts/generate-search-excellence.mjs`

| Family | Cases |
|--------|------:|
| Everyday grocery self-shop | 80 |
| Electronics / home | 60 |
| Gift + budget + city | 60 |
| Vague → clarify → search | 40 |
| Multi-category combo | 40 |
| Zero-result + retry | 40 |
| Sinhala / Singlish search | 40 |
| CareCart parity traps | 40 |

**Gate:** AA ≥90% / ≥90% → `phase-2.json`

---

### Phase 3 — Results UX (P1) — match & beat CareCart

| Feature | Kira target | Component |
|---------|-------------|-----------|
| Price + stock on every card | ✓ | `ProductCard.tsx` |
| Add → toast + “Added ✓” | ✓ | `KiraExperience.tsx` |
| Sticky cart footer | ✓ | `CartFooter.tsx` (new) |
| “Kira’s plan” sidebar | ✓ + delivery quote | `KiraSidebar.tsx` (new) |
| Post-search chips | ✓ | SSE `suggestions` + `QuickReplies.tsx` |
| View all matches | ✓ | expand grid or `/shop/search-results` |
| Product quick view | ✓ (moat) | promote tap target |

**Gate:** Manual UX checklist (10 flows) + CEO ≥9/10 on 20 demos; B01–B10 unchanged or better

---

### Phase 4 — Language & everyday shopper (P1)

Per Kapruka challenge brief: **everyday shopper is the primary user**; Sinhala/Tanglish stand out.

| Task | Detail |
|------|--------|
| Auto script detection | First message sets `language` + UI chrome |
| Self-shop in all 5 modes | Group Z everyday (90×5) ≥90% |
| Grocery honesty copy | Localized `groceryHamperPivot` when only hampers exist |
| Complete Group Z 2500 | 5×500 blocks → `test-results/dulith-multilingual/summary.json` APPROVED |

Detail: [`docs/MULTILINGUAL-2500-PLAN.md`](./MULTILINGUAL-2500-PLAN.md)

---

### Phase 5 — Agent loop slim-down (P2)

- Enforce `shouldBypassSearchFastPath()` after Phase 1
- Move search rules from prompt into code (token cost ↓ ~30%)
- 8B fallback: never show carousel without tool proof
- **Gate:** Groups U + V ≥90%

---

### Phase 6 — Beyond CareCart (P2) — moat

Features CareCart lacks — polish, don’t hide:

| Feature | Why |
|---------|-----|
| Product quick view + variants | Confidence before add |
| Order tracker timeline | Post-purchase trust |
| Breakup hand-deliver | Challenge email story |
| Delivery quote per request | Logistics transparency |
| One-tap reorder (Group X) | Dulith #1 habit ask |
| Cart edit via chat | “Remove roses”, “make it 2” |

**Gate:** Groups X + Y remain ≥90%; 15-min CEO demo ≥9/10

---

### Phase 7 — Final Dulith gate

```bash
npm run test:search-excellence        # Group AA 400
npm run test:dulith-qa                # S T U V W X
npm run test:z-2500:supervisor:full   # Z 2500
npm run test:search-benchmark         # B01–B10 production
npm run test:dulith-gate              # aggregate
```

**Verdict:** `test-results/search-excellence/VERDICT.json`

```json
{
  "verdict": "APPROVED — Search & shopping excellence standard met.",
  "benchmark": { "passed": 10, "total": 10 },
  "carecartParity": true,
  "carecartExceeded": ["relevance", "budget", "tracking", "quickView", "honesty"]
}
```

---

## QA inventory (all groups)

| Group | Cases | Phase gate |
|-------|------:|------------|
| S — search routing | 200 | Phase 1 |
| T — category purity | ~120 | Phase 1–2 |
| U — context bleed | ~80 | Phase 5 |
| V — vague intent | ~60 | Phase 1–2 |
| W — repair flow | ~60 | No regression |
| X — reorder | ~60 | Phase 6 |
| Y — breakup/repair | 500 | No regression ✓ |
| Z — multilingual | 2500 | Phase 4 |
| **AA — search excellence** | **400** | **Phase 2 (new)** |

Program overview: [`docs/DULITH-QA-PROGRAM.md`](./DULITH-QA-PROGRAM.md)

---

## Success metrics

| Metric | Baseline | Phase 1 | Phase 3 | **Final** |
|--------|----------|---------|---------|-----------|
| Benchmark B01–B10 | ~6/10 | 8/10 | 9/10 | **10/10** |
| Group AA pass | — | — | — | **≥90%** |
| Group Z everyday (90×5) | ~70% | 85% | 90% | **≥90%** |
| Junk SKU in carousel | ~15% fail | ≤5% | ≤2% | **≤2%** |
| Ask instead of search (concrete noun) | ~25% | ≤5% | ≤2% | **≤2%** |
| Tool markup leaks | fixed | 0 | 0 | **0** |
| CEO lens aggregate | ~85% | 90% | 92% | **≥93%** |
| Time-to-first-carousel | 3–8s | ≤4s | ≤3s | **≤3s** |

---

## First sprint (Phase 1 minimum)

Smallest path to visible improvement:

1. `resolveSearchIntent()` + `executeSearchPlan()` with multi-term grocery
2. Remove junk fallback in `app/api/chat/route.ts`
3. Electronics + grocery `CATEGORY_RELEVANCE_TERMS` in `search.ts`
4. Wire `suggestions` SSE + 3 chips after products
5. Run B01–B05 + Group T smoke (25 cases) on **production** API
6. Dulith review → iterate until benchmark ≥8/10

Then: full Phase 2 (Group AA 400) + Phase 3 UX.

---

## Dulith operating loop (every phase)

1. Run persona group + benchmark matrix
2. Cluster failures (routing / MCP / filter / UX / copy)
3. Fix **highest-impact cluster architecturally**
4. Re-run failed IDs → full group re-run
5. CEO lens on failures until ≥90%
6. **Do not start next phase until current gate is green**

---

## Sub-plans (detail by domain)

| Document | Scope |
|----------|-------|
| [`SEARCH-EXCELLENCE-MASTER-PLAN.md`](./SEARCH-EXCELLENCE-MASTER-PLAN.md) | Search architecture, AA generator, file map |
| [`MULTILINGUAL-2500-PLAN.md`](./MULTILINGUAL-2500-PLAN.md) | Group Z five-mode gates |
| [`SEARCH-ROUTING-PLAN.md`](./SEARCH-ROUTING-PLAN.md) | Multi-category combos |
| [`CATEGORY-PURITY-PLAN.md`](./CATEGORY-PURITY-PLAN.md) | Gift lane junk |
| [`VAGUE-INTENT-PLAN.md`](./VAGUE-INTENT-PLAN.md) | Clarify vs carousel |
| [`CONTEXT-BLEED-PLAN.md`](./CONTEXT-BLEED-PLAN.md) | Follow-up category |
| [`REORDER-PLAN.md`](./REORDER-PLAN.md) | One-tap habit loop |
| [`BREAKUP-REPAIR-PLAN.md`](./BREAKUP-REPAIR-PLAN.md) | Hand-deliver flow |

---

## Explicit non-goals

- Custom search index replacing Kapruka MCP
- Per-phrase regex for every Singlish variant
- Lowering Dulith gate below 90% to greenwash a phase
- Scraping Amazon / Global Shop

## Ops constraints

- MCP: 60 req/min/IP — max 3 parallel query lanes per turn
- Groq: persona suites at `--concurrency 1`
- Production deploy required for B01–B10 (valid Groq keys on Vercel)
- Retry alternate **query terms**, not same MCP call in a loop

---

*Excitement is earned with evidence — benchmark greens, persona gates, and live repro —
not claimed.*
