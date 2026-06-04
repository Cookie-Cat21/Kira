# Kira — Master Plan to Win the Kapruka Agent Challenge 2026

> **Goal:** Win the M4 Mac Mini by scoring highest on the Kapruka rubric (out of 100).
> **Deadline:** 30 June 2026 · **Today:** 04 June 2026 · **Runway:** ~26 days.
> **Constraint:** Solo builder, free-tier everything, must be a *live public URL* judges can open.
> **Strategy:** Spend effort in proportion to rubric weight, and win the bonus categories almost no one will attempt (Sinhala, full checkout-to-tracking loop).

---

## 1. The scoring math (where the points actually are)

| Category | Pts | Current estimate | Target | Gap to close |
|---|---:|---:|---:|---|
| Experience & polish | 30 | ~18 | 27 | Reliability under judging, micro-interactions, no dead-ends |
| Visual richness | 20 | ~11 | 18 | Bigger imagery, quick-view, carousels, skeletons |
| Personality | 15 | ~9 | 13 | 70B voice + **Sinhala**, occasion awareness |
| Usefulness | 15 | ~8 | 14 | Budget/stock filters, perishable warnings, real delivery quotes |
| End-to-end completeness | 15 | ~10 | 15 | Gift msg + multi-item verified, **order tracking** |
| Creativity | 5 | ~2 | 5 | One signature "wow" (occasion concierge / Sinhala) |
| **Total** | **100** | **~58** | **~92** | |

**Bonus multipliers** (the brief calls these out explicitly): Multi-item carts · Delivery-date constraints · Gift messaging · Tanglish · **Sinhala** ("almost no one will attempt it — pull it off and you'll stand out instantly").

**Read of the rubric:** Visual richness (20) is our most *under-served-vs-weight* category. Usefulness (15) is the cheapest to lift because the MCP already supports everything we're not using. Personality+Sinhala is the biggest *differentiation* lever. Experience (30) is mostly a *reliability* problem now, not a design problem.

---

## 2. Current state (grounded in the code, as of this plan)

**Stack:** Next.js 16.2.7 (App Router, React 19.2.4), Tailwind v4 (CSS `@theme` tokens in `app/globals.css`), `framer-motion` 12.40 (installed, barely used), `groq-sdk` 1.2, `@modelcontextprotocol/sdk` 1.29.

**Design tokens** (`app/globals.css`): Kapruka purple `#402970`, yellow `#f8da08`, lavender surfaces `#f7f5fc`/`#f3eeff`, fonts DM Serif (display) + Jakarta (sans). Animations: `fade-up`, `pop-in`, `blink`, `dot-grid`.

**Backend** (`app/api/chat/route.ts`):
- Free-tier **model cascade** `llama-3.3-70b-versatile → llama-4-scout → llama-3.1-8b-instant`, fallback on 429. ✅ shipped.
- `MAX_TOOL_ROUNDS = 6`, `max_tokens = 512`.
- Per-request delivery cache; module-level MCP tool-list cache (5 min TTL).
- Product dedup + cap at 6; `tool_use_failed` recovery (fixed — reads nested `err.error.error`).
- **All 7 MCP tools are exposed to the model**, but only 5 are labeled in `TOOL_STEPS` and only ~4 are *driven* by the prompt.

**Frontend** (`app/page.tsx`, `app/components/*`): full-screen chat, opening chips, cart state + drawer, product carousel, pay-link CTA, a11y pass shipped. City detection = **hardcoded 19-city English regex** (`page.tsx`).

**Prompt** (`lib/kira-prompt.ts`): Tanglish, "limit 4", "check delivery once per city", create_order guardrails. No price/stock filtering, no perishable handling, no Sinhala, no tracking.

### MCP tool utilization matrix

| Tool | Params | Used today? | Target |
|---|---|---|---|
| `kapruka_search_products` | q, category, **min_price, max_price, in_stock_only, sort**, limit, cursor, currency | partial (q + limit) | **drive budget/stock/sort filters** |
| `kapruka_get_product` | product_id, currency | rarely | **quick-view: variants + images** |
| `kapruka_list_categories` | depth | yes | keep |
| `kapruka_list_delivery_cities` | query, limit | ❌ no | **alias/Sinhala-aware city resolve** |
| `kapruka_check_delivery` | city, **delivery_date, product_id** | city-only | **add date + product → fee + perishable** |
| `kapruka_create_order` | cart, recipient, delivery, sender, **gift_message**, currency | yes | verify gift + multi-item |
| `kapruka_track_order` | order_number | ❌ no | **post-checkout tracking loop** |

**MCP limits to respect:** 60 req/min/IP, 30 orders/hr/IP, 30-min server cache on reads.

---

## 3. Guiding principles

1. **Rubric-first.** Every task names the category + points it serves. If it doesn't move a number, it's backlog.
2. **The MCP is free leverage.** Prefer driving an existing tool param over building new UI.
3. **Reliability is a feature** (Experience 30). A demo that 429s mid-judging scores zero on the spot. Token budget is the #1 risk.
4. **Differentiate, don't polish-to-parity.** Sinhala + full loop beat a 5th shade of purple.
5. **Always shippable.** `master` stays deployable; verify e2e after each epic.

---

## 4. Workstreams (epics)

Each epic: **Why → Current → Tasks (with files/params) → Acceptance → Effort → Risk.**
Effort: S ≈ <2h, M ≈ half-day, L ≈ 1–2 days.

### EPIC A — Smarter search: budget, stock, sort  ·  Usefulness (15) + bonus
**Why:** When a user states a budget, Kira should filter the *query*, not guess. Directly lifts Usefulness and feeds budget-aware gifting.
**Current:** Prompt says only "set limit to 4"; `min_price/max_price/in_stock_only/sort` exposed but never instructed.
**Tasks:**
- A1. `lib/kira-prompt.ts` — add a **Search parameters** section: map stated budget → `max_price` (and `min_price` for "premium/nice"); always `in_stock_only: true`; use `sort` for "cheapest"/"best". (S)
- A2. `app/api/chat/route.ts` — confirm `coerceArgTypes` passes numeric `min_price/max_price` cleanly (already coerces strings→number); add to `TOOL_STEPS` copy if a "filtering by budget" step is wanted. (S)
- A3. Optional UI: a budget chip row ("Under 2k / 2–5k / 5k+") that injects a structured ask. (M)
**Acceptance:** "chocolate under 3000" → results all ≤ LKR 3000 and in stock; "show me something premium" sorts/raises floor.
**Effort:** S–M · **Risk:** low (prompt-led; weak models may ignore filters → mitigated by 70B primary).

### EPIC B — Real delivery intelligence: fee, date, perishable  ·  Usefulness + Delivery-date bonus + End-to-end
**Why:** `kapruka_check_delivery` returns the **flat LKR rate** and a **perishable warning** for cakes/flowers/combos when given `delivery_date` + `product_id`. This is a uniquely local, judge-pleasing touch and we currently throw it away.
**Current:** Called city-only; cards show "Delivers to {City}" with no fee/date; cache keyed by city alone (`route.ts`).
**Tasks:**
- B1. `lib/kira-prompt.ts` — instruct Kira to pass `delivery_date` + `product_id` when a product and date are in play; surface perishable warnings conversationally ("🎂 cakes are made fresh — let's pick a near date"). (S)
- B2. `route.ts` — extend the delivery result extraction to capture `{ fee, perishable, eta }`; widen the cache key to `city|date|product` so date-specific quotes aren't cross-served. (M)
- B3. SSE: add a `delivery` event (fee + perishable) so the client can badge it. (M)
- B4. `ProductCard.tsx` / `ChatMessage.tsx` — render fee + a perishable chip on cards/checkout. (M)
**Acceptance:** Quoting a cake to Kandy on a date shows the LKR fee and a perishable note; non-perishables show fee only; re-quote for a different date isn't cached incorrectly.
**Effort:** M–L · **Risk:** medium (need real MCP response shape — verify with MCP Inspector / a probe).

### EPIC C — Alias & Sinhala-aware city resolution  ·  Usefulness + Sinhala bonus
**Why:** Replace the brittle hardcoded English regex with the MCP's `kapruka_list_delivery_cities`, which understands **vernacular aliases**. Foundation for Sinhala.
**Current:** `page.tsx` regex of 19 English city names; "මහනුවර"/misspellings fail.
**Tasks:**
- C1. `lib/kira-prompt.ts` — instruct Kira to resolve ambiguous/vernacular city mentions via `kapruka_list_delivery_cities` before `check_delivery`. (S)
- C2. `route.ts` — add `kapruka_list_delivery_cities` to `TOOL_STEPS`; capture the resolved canonical city into the `deliveryCity` SSE so the client badge updates. (M)
- C3. `page.tsx` — keep the regex as a fast-path hint, but treat the server-resolved canonical name as source of truth. (S)
**Acceptance:** Sinhala/aliased/misspelled city inputs resolve to the correct canonical city and badge.
**Effort:** M · **Risk:** low–medium.

### EPIC D — Close the loop: order tracking  ·  End-to-end completeness (15)
**Why:** `kapruka_track_order` is unused. Discovery → checkout → **tracking** completes the loop almost no entry will.
**Current:** After `create_order` we emit a pay link and stop.
**Tasks:**
- D1. `lib/kira-prompt.ts` — after a successful order, proactively offer tracking and explain where the order number comes from (confirmation email / order-complete page). (S)
- D2. `route.ts` — add `kapruka_track_order` to `TOOL_STEPS`; emit a structured `tracking` SSE (status + timeline). (M)
- D3. New component `OrderTracker.tsx` — render a vertical status timeline (framer-motion). (M)
- D4. `page.tsx` — a persistent "Track an order" affordance. (S)
**Acceptance:** Pasting a valid order number renders a status timeline; invalid numbers fail gracefully in-character.
**Effort:** M · **Risk:** low (read-only tool).

### EPIC E — Visual richness: quick-view, imagery, skeletons  ·  Visual richness (20)
**Why:** Highest-weight under-served category. Cards are small (`w-44`, single thumbnail).
**Current:** `ProductCard` thumbnail only; `kapruka_get_product` (variants + multiple images) unused.
**Tasks:**
- E1. **Quick-view modal/sheet** — on card tap, call `kapruka_get_product`; show image carousel, variants, price, stock, full description, Add-to-cart. (L)
- E2. **Skeleton product cards** during the tool loop (replaces bare spinner) — uses existing `pop-in`/`fade-up` + framer-motion. (M)
- E3. **Hero/featured treatment** for single strong results vs the carousel for many. (M)
- E4. **Polish pass** with the `frontend-design` / `interaction-design` skills: hover elevation, image zoom, staggered reveals (already partially present). (M)
**Acceptance:** Tapping a card opens a rich detail view with multiple images + variants; searches show skeletons, not a dead spinner.
**Effort:** L · **Risk:** medium (more UI surface to keep reliable on mobile).

### EPIC F — Personality v2 + Sinhala  ·  Personality (15) + the standout bonus + Creativity (5)
**Why:** The single biggest differentiator in the rubric. 70B makes Sinhala realistic now.
**Current:** Tanglish-only; occasion awareness is shallow; opening greeting is time-of-day only.
**Tasks:**
- F1. **Language detection + mirroring** — if the user writes Sinhala (or asks), reply in Sinhala/Tanglish; else Tanglish. Prompt-led with a few-shot block in `kira-prompt.ts`. (M)
- F2. **Day-1 Sinhala quality gate** — native-speaker spot check (per project memory rule); ship only what passes. (M)
- F3. **Occasion concierge** — opening scene aware of upcoming SL occasions (Vesak, Avurudu, Poya); suggested chips adapt. Extend `getContextualGreeting()`. (M)
- F4. **Voice tightening** — opinionated picks, one question at a time, no walls of text (already in prompt; reinforce + add few-shots). (S)
**Acceptance:** A Sinhala greeting gets a natural Sinhala reply that a native speaker rates ≥4/5; opening reflects the nearest real occasion.
**Effort:** M–L · **Risk:** medium (LLM Sinhala quality variance — gate it).

### EPIC G — Reliability & ops for judging  ·  Experience (30) + "must be live"
**Why:** Biggest risk to the 30-pt category is the **Groq free-tier token ceiling** (70B = 100k tokens/day). Under judging load it cascades to weaker models that misbehave.
**Current:** Cascade exists; but every round resends the full system prompt + all 7 tool schemas across up to 6 rounds → token-heavy.
**Tasks:**
- G1. **Token diet** — trim the system prompt; consider sending the full tool schema set only on round 0 and a slimmed set after; lower `MAX_TOOL_ROUNDS` to 4–5 where safe. Target: cut tokens/conversation ~40%. (M)
- G2. **Graceful busy state** — on full-cascade rate-limit, return an in-character "I'm slammed right now, try me in a moment 🙏" instead of the generic error. (S)
- G3. **Deploy verification** — confirm the Vercel URL is live, env vars set, and stays up; add `/health`-style smoke check. Custom domain/subdomain. (M)
- G4. **Mobile QA** — the brief's customers are mobile; verify drawer, carousel, quick-view, keyboard on real viewport. (M)
- G5. **Load sanity** — simulate a few concurrent sessions; confirm cascade + caches hold within 60 req/min. (S)
**Acceptance:** A 10-message judged session never shows a raw error; URL is public and stable; mobile is clean.
**Effort:** M · **Risk:** medium (depends on daily token budget — see Risk Register).

### EPIC H — Decided items / cleanup
- H1. **#7 real streaming — HOLD** (documented rationale: tool loop dominates latency; step indicators already give live feedback; non-streaming preserves the recovery path the fallback models need). Revisit only if G1 frees budget and we move primary off Groq. (—)
- H2. **Branch hygiene** — GitHub default is `main` but work lives on `master`; pick one (switch default to `master` or merge) so `Closes #` works and PRs target correctly. (S)
- H3. **Regression e2e** after each epic (the controlled-textarea quirk: set value via native setter + input event, then dispatch Enter). (S each)

---

## 5. Prompt v2 spec (`lib/kira-prompt.ts`) — concrete additions

Add/extend these sections (keep total prompt lean for EPIC G):
- **Search parameters:** budget→`max_price`, premium→`min_price`/`sort`, always `in_stock_only: true`, `limit: 4`.
- **Delivery:** when a product + date exist, call `check_delivery` with `city + delivery_date + product_id`; relay the **fee** and any **perishable** warning; resolve vernacular cities via `list_delivery_cities` first.
- **Checkout:** unchanged guardrails (no placeholder values; collect one field at a time; `sender:{anonymous:true}`); after success, **offer `track_order`**.
- **Language:** detect Sinhala input → mirror in Sinhala/Tanglish; default Tanglish; never robotic.
- **Occasions:** be aware of the nearest SL occasion; weave it in lightly.
- **Few-shots:** 2–3 short exemplars (budget search, perishable cake to a city, Sinhala greeting).

---

## 6. Sequenced roadmap (26 days)

**Phase 1 — MCP leverage & usefulness (Jun 5–10).** EPIC A, B, C. Cheapest points, foundation for the rest. Ship + e2e after each.

**Phase 2 — Close the loop (Jun 11–14).** EPIC D (tracking), verify gift message + multi-item checkout. End-to-end completeness → 15/15.

**Phase 3 — Visual richness (Jun 15–20).** EPIC E (quick-view, skeletons, hero). The 20-pt push. Use `frontend-design`/`interaction-design` skills.

**Phase 4 — Personality & Sinhala (Jun 21–24).** EPIC F. Native-speaker gate. The differentiator.

**Phase 5 — Reliability, mobile, deploy (Jun 25–28).** EPIC G. Token diet, busy-state, mobile QA, custom domain, load sanity.

**Phase 6 — Hardening & submit (Jun 29–30).** Full regression e2e, judge-path dry run on the live URL, submit link. Buffer.

*(Phases overlap where safe; reliability work (G) can start early if token limits bite during testing.)*

---

## 7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Groq 70B 100k tokens/day exhausts during judging | High | High | Cascade (done) + token diet (G1) + busy-state (G2); consider higher-headroom primary |
| Weak fallback model misbehaves (premature create_order, malformed args) | Medium | High | Recovery fixed; keep guardrails; 70B primary; MCP rejects bad orders |
| Sinhala quality embarrasses | Medium | Medium | Day-1 native gate (F2); ship only what passes; Tanglish fallback |
| MCP response shape differs from assumptions (fee/perishable/tracking) | Medium | Medium | Probe via MCP Inspector before coding extraction (B, D) |
| Live URL down when judged | Low | Fatal | Deploy verification + uptime check (G3); submit early, re-test |
| Mobile layout breaks (drawer/quick-view) | Medium | Medium | Mobile QA (G4) each phase |
| Scope creep eats the deadline | Medium | High | Rubric-first; backlog anything that doesn't move a number |

---

## 8. Definition of done / submission checklist

- [ ] Budget/stock/sort filters drive real queries (A)
- [ ] Delivery fee + perishable warnings shown, date-aware (B)
- [ ] Vernacular/Sinhala city resolution works (C)
- [ ] Order tracking timeline works end-to-end (D)
- [ ] Quick-view with variants + image carousel; skeletons on search (E)
- [ ] Sinhala mirroring passes native spot-check; occasion-aware opening (F)
- [ ] No raw errors in a 10-message judged session; graceful busy-state (G)
- [ ] Multi-item cart + gift message verified through `create_order` (D/checklist)
- [ ] Live public URL (custom domain), mobile-clean, stays up (G)
- [ ] Full regression e2e green; judge-path dry run recorded
- [ ] Submission form sent before 30 Jun 2026

---

## 9. Issues to file (maps to epics)

A→ "Drive search price/stock/sort filters from user budget"
B→ "Delivery quotes: fee + perishable + date via check_delivery params"
C→ "Resolve cities via kapruka_list_delivery_cities (alias/Sinhala)"
D→ "Order tracking loop (kapruka_track_order + timeline UI)"
E→ "Product quick-view (get_product: variants + images) + search skeletons"
F→ "Personality v2 + Sinhala mirroring + occasion-aware opening"
G→ "Reliability for judging: token diet + busy-state + deploy/mobile QA"
H→ "Branch hygiene: reconcile main/master default"

---

*Living document. Update the score estimates and checklist as epics land.*
