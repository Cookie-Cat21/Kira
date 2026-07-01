# One-Tap Reorder Plan (CEO Priority)

## Problem — why judges say "reorder isn't done"

Kapruka's repeat buyers (birthday cake every year, anniversary flowers, monthly hampers) are the **highest-LTV habit**. Dulith's #1 product ask for this challenge is: **make reordering easier than going back to kapruka.com**.

Today Kira has reorder **machinery** but not a **product story**:

| What exists (v0.3) | What the CEO / judge expects |
|--------------------|------------------------------|
| Say `"order again"` in chat | Big **"Order this again"** button after checkout |
| `lastOrder` in localStorage (same browser) | **Welcome back** card on return: *"Reorder Amma's birthday cake?"* |
| Reorder re-shows carousel | **Pre-filled checkout** — skip recipient, city, address you already know |
| Tracking card → **Add to cart** | Tracking → **Review + pay** in one step (no cart detour) |
| Quick reply chip `"Order again"` | Visible habit loop, not a chat Easter egg |

**Root cause:** Reorder was built as a **deterministic fast-path + prompt nudge**, not as a **first-class commerce flow**. Regex and Group K personas prove the chat path works; they do not prove a returning customer can reorder in one tap without thinking.

This is not a whack-a-mole regex problem — it needs **UI + state + checkout prefill architecture**, with chat as a fallback.

---

## Strategy — four layers (minimal CEO close, no Supabase required)

### Layer 1 — Post-checkout habit surface (UI)

After successful `kapruka_create_order` + pay link:

1. **Primary CTA:** full-width **"Order this again"** on the checkout success card (not buried in quick replies).
2. **Secondary:** keep quick reply `"Order again"` for chat-native users.
3. Persist `lastOrder` snapshot with **full checkout context**:
   - `items[]`, `orderRef`, `recipient`, `delivery` (city, address, date, phone), `giftMessage`, `senderName`, `placedAt`, optional `label` (e.g. *"Amma's birthday cake"*).

**Acceptance:** Judge completes one order → sees obvious reorder button → tap → lands in checkout review with cart filled.

### Layer 2 — Return visit recognition (localStorage, no account)

On app load when `lastOrder` exists and cart is empty:

1. Show a **Welcome back** strip or opening bubble suggestion:
   - *"Welcome back — reorder **{label or first item}** to **{city}**?"*
2. One tap → open **CheckoutModal at `review` step** (or pre-filled delivery step if date stale).
3. If delivery date is in the past → auto-bump to **soonest valid date** (Colombo tomorrow default) with inline note.

**Acceptance:** Close tab, reopen `/` or `/shop/cakes` → reorder prompt visible within 3s, no chat required.

### Layer 3 — Checkout prefill on reorder (skip re-asking)

When reorder triggers (button, welcome card, tracking, or chat `"order again"`):

1. Hydrate cart from `lastOrder.items`.
2. Open checkout with **delivery fields pre-filled** from saved snapshot.
3. Only ask for fields that are **missing or invalid** (empty phone, past date).
4. Chat fast-path: if user says `"order again"` and `lastOrder` exists → **open checkout modal directly** via client event (SSE `reorderCheckout` or `openCheckout` with prefill payload), not just product carousel.

**Acceptance:** Reorder flow ≤ **2 taps** from success card to pay link (Reorder → Confirm → Pay).

### Layer 4 — Track → pay (not add-to-cart)

On `OrderTracker` **"Reorder these items"**:

1. Replace current behavior (dump to cart, user hunts for checkout).
2. New behavior: hydrate cart + **open CheckoutModal at review** with tracking recipient/delivery if available.
3. If tracking lacks address → prefill what MCP returned, ask only for gaps.

**Acceptance:** Live repro `track order KP…` → Reorder → checkout review → pay link without manual "checkout" chat message.

---

## Phase 2 — CEO-grade (explicitly deferred, non-blocking for v1)

| Feature | Why deferred |
|---------|----------------|
| Kapruka account login + order history | Needs auth API or scraped history — out of MCP scope |
| Supabase / cross-device sync | Aura pattern; v1 uses `kira_session_v2` localStorage |
| Scheduled reorder / occasion reminders | Retention product, not challenge demo |
| `"Reorder similar"` (not identical SKU) | Needs search fallback when SKU discontinued |

Document Phase 2 in README so judges know the roadmap; **ship Phase 1 for the demo**.

---

## Automated QA — Group X (~60 cases)

New domain **`one-tap-reorder`** → Group **X** (`scripts/generate-reorder-habit.mjs`).

### X-chat (API / SSE)

- `lastOrder` with items + delivery → `"order again"` → expects `openCheckout` or checkout SSE with prefill (not carousel-only).
- `lastOrder` with past date → reorder bumps date, no hard error.
- No `lastOrder` → honest prompt for order ref or first purchase.
- `reorder KP-xxxxx` → track → products or checkout path.
- Sinhala / Tanglish reorder phrases.

### X-ui (Playwright — `tests/e2e/reorder.spec.ts`)

- Post-checkout success card shows **Order this again** button.
- Button opens checkout with pre-filled city/recipient.
- Welcome-back strip on reload with seeded `localStorage`.
- OrderTracker reorder opens checkout review (not cart-only).

### Checks

- `reorderOpensCheckout` — reorder must not stop at carousel only when history exists.
- `checkoutPrefill` — city + recipient preserved from `lastOrder`.
- `noChatRequired` — UI path completes without typing "checkout".
- `ceoReorderPath` — CEO lens flags `one_tap_reorder` when UI + prefill present.
- CEO / Dulith founder gate **≥90%** on Group X.

### Live regression traps (add to `live-regression.mjs`)

| ID | Trap |
|----|------|
| LIVE-X001 | Seed `lastOrder` → API `"order again"` → checkout prefill event or modal path |
| LIVE-X002 | Post-checkout SSE includes `lastOrder` with delivery snapshot |

---

## Orchestrator loop

```bash
node scripts/dulith-plan-review.mjs --domain one-tap-reorder   # ≥9/10
node scripts/generate-reorder-habit.mjs
node scripts/test-personas.mjs --group x --concurrency 1
npx playwright test tests/e2e/reorder.spec.ts
npm run test:live-regression   # includes LIVE-X001–X002 after deploy
```

Fix highest-impact failure cluster; re-run until **≥90%** persona + CEO on Group X.

---

## What we do NOT do (v1)

- Do NOT require users to type `"order again"` as the only path.
- Do NOT show carousel without opening checkout when full `lastOrder` delivery context exists.
- Do NOT reset delivery fields on reorder — never make them re-type Amma's address.
- Do NOT invent past orders — only `lastOrder`, `track_order`, or explicit KP ref.
- Do NOT block v1 on Supabase/auth — localStorage habit loop first.

---

## Success criteria

| Gate | Target |
|------|--------|
| Dulith plan review | **≥9/10** excitement |
| Group X persona pass | **≥90%** |
| Group X CEO lens | **≥90%** |
| Playwright reorder e2e | **100%** (3–5 tests) |
| Live traps LIVE-X001–X002 | **pass on kira-peach.vercel.app** |
| Judge script (60s demo) | Order → **Order this again** → pay link, no chat |

### Live repro scripts (for Dulith dry-run)

1. Complete sandbox checkout → tap **Order this again** → confirm pre-filled Colombo delivery → pay link.
2. Reload site → **Welcome back** reorder card → one tap to checkout.
3. Track sample order → **Reorder these items** → checkout review (not cart drawer only).

---

## Sri Lanka / Kapruka context

- Repeat occasions: Avurudu hampers, birthday cakes to parents in Colombo/Kandy/Galle, anniversary flowers.
- Many buyers send from abroad — **saved recipient + address** is the pain reorder solves.
- Tanglish: *"same as last time machang"*, *"ammage cake eka enne"* → must hit same one-tap path as English.

---

## Implementation order (for the agent loop)

1. Extend `LastOrder` type + SSE payload (recipient, delivery, label).
2. Post-checkout UI — primary **Order this again** button.
3. `CheckoutModal` — accept full prefill; open at `review` when reordering.
4. Client handler for reorder events from chat fast-path.
5. Welcome-back strip on `KiraExperience` + store pages.
6. OrderTracker → checkout (not cart-only).
7. Group X generator + Playwright + live traps.
8. Dulith QA orchestrator gate.

**Estimated invasiveness:** ~6 files UI, ~2 files types/API, ~1 new e2e spec, ~1 generator — focused diff, no new infra.
