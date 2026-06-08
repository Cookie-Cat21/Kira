# Kira — Master Plan v2 (CEO Criteria + Rubric)

> **Goal:** Win the Kapruka Agent Challenge — build an agent judges never want to leave for kapruka.com  
> **Deadline:** 30 June 2026 · **Updated:** 8 June 2026  
> **Strategy:** CEO priorities (reorder, personality, local language, speed) + rubric-weighted polish

---

## Scoring lens

| Category | Pts | Status (8 Jun) | CEO alignment |
|---|---:|---|---|
| Experience & polish | 30 | Reorder UX, post-order chips, skeletons, session v2 | Website replacement stickiness |
| Visual richness | 20 | Quick-view, hero sizing, search skeletons | Full-screen product showcase |
| Personality | 15 | CEO repair-gift few-shots + deterministic guard | "Bro, hand-deliver it yourself" |
| Usefulness | 15 | Reorder, rush/sale/brand/hamper fast-paths | Reorder #1 CEO ask |
| End-to-end completeness | 15 | Search → checkout → pay link → tracking | Never go back to website |
| Creativity | 5 | Sinhala/Tamil modes + friend personality | Local language bonus |
| **Total target** | **~93/100** | | |

---

## Shipped in v2 (8 June)

### EPIC I — Reorder
- `LastOrder` type + `kira_session_v2` persistence
- Fast-paths: `order again` / `buy again` (session) + `reorder KP-xxxxx` (via `track_order`)
- Post-checkout `lastOrder` SSE + QuickReply chips
- Tests 55–56

### EPIC J — Personality gold demo
- Few-shots: angry partner / hand-deliver / insist on delivery
- `REPAIR_GIFT_RE` deterministic guard (advice before search)
- Test 57

### EPIC K — Breadth beyond gifts
- Rush/same-day, sale/deals, hamper, bakery brand fast-paths
- Hero chips: Grocery, Kids & Toys, Home & Lifestyle
- Global Shop coming-soon message
- Tests 58–62

### EPIC L — Upsell
- Add-on parsing in `mcp-parsing.ts`
- Selectable variants in `ProductQuickView`
- Cross-sell + add-on prompt rules in `kira-prompt.ts`

### EPIC M — Post-order UX
- Order ref copy button on checkout card
- "Reorder these items" on `OrderTracker`
- New chat preserves `lastOrder`
- Post-checkout QuickReplies: Order again / Track / Browse

### EPIC N — Visual
- Search skeleton cards (ThinkingLive)
- Larger ProductHero image (`min-h-48`)

### EPIC O — Reliability
- Per-request date injection (already in route)
- `scripts/judge-dry-run.mjs` — 10-step judge script
- 62 core feature tests

---

## Judge demo script (2 min)

1. Greeting → Electronics chip (breadth)
2. Sinhala mode + Unicode gift request
3. "Wife is angry, send flowers" → hand-deliver advice
4. "Chocolate under 3000 to Kandy today" → products + delivery
5. Add to cart → checkout → pay link
6. "Order again" → cart rebuilds
7. "Track KP-XXXXX" → timeline

Run automated dry-run: `node scripts/judge-dry-run.mjs`

---

## Test commands

```bash
npm run lint && npm run build
node scripts/test-mcp.mjs
node scripts/run-tests.mjs          # 62 tests — port 3107
node scripts/test-personas.mjs --concurrency 1
npx playwright test
node scripts/judge-dry-run.mjs
```

---

## Submission checklist

- [x] Reorder within-session + order-ref path
- [x] Emotional scenario shows opinionated friend
- [x] Sinhala/Tamil/Tanglish modes
- [x] Non-gift category chips
- [x] Post-order track + reorder chips
- [x] Rush/sale/brand/hamper fast-paths
- [x] Add-ons + variant selection in quick-view
- [x] Search skeletons + hero polish
- [x] Judge dry-run script
- [ ] Live public URL verified before submit
- [ ] 2-min demo video recorded
- [ ] Submit before 30 Jun 2026

---

## Out of scope (CEO confirmed)

- Order editing (not in MCP during competition)
- Code ownership transfer (host on your domain)
- Global Shop MCP (coming soon — graceful redirect only)

---

*Living document — v2 replaces the 4 June plan after CEO Q&A (8 June).*
