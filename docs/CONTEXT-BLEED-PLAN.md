# Context Bleed Plan

## Problem

When a user **changes category mid-thread**, Kira sometimes filters the new search using the **prior turn's category**:

1. User: "show me flowers" → carousel of bouquets ✅
2. User: "show me chocolates" → still flower-filtered or flower-heavy results ❌
3. User: "Show me options under LKR 3,000" (after flowers) → pens, cards, condoms ❌

Root cause: `resolveProductFilterKey()` and `buildMessageFilterContext()` merging prior user turns into filter context when the current query is vague or a new explicit category should win. Breaks trust on Kapruka multi-turn shopping in Colombo and beyond.

## Strategy

### Layer 1 — Current turn wins

In `lib/kira/search.ts`:

- Explicit category in **current message** always overrides prior turns
- `VAGUE_SEARCH_QUERY_RE` ("options", "more", "gifts") inherits context — but only when current message has **no** new category keyword
- New category keyword in current turn → reset filter key

### Layer 2 — Vague follow-ups inherit safely

"options under 3000" after flower search → stay in flowers lane + family-safe + flower junk filters.

"chocolates under 3000" after flower search → **chocolate** lane, not flowers.

### Layer 3 — Automated QA (Group U)

~80 multi-turn personas:

- flowers → chocolates (category switch)
- chocolates → flowers
- flowers → "options under 3000" (same category)
- flowers → "show me chocolates under 3000" (switch + budget)
- cakes → "more options"
- Re-show / more paths with rotated sorts

Checks:

- `noContextBleed` — carousel matches **current** user message category
- `searchRelevance`, `noFamilyUnsafe`
- CEO lens **≥90%**

### Layer 4 — Orchestrator loop

Re-run Group U until ≥90% on all gates.

## What we do NOT do

- Ignore conversation history entirely (breaks re-show / more)
- Use full thread as filter context when current turn names a new category

## Success criteria

| Gate | Target |
|------|--------|
| Group U persona pass | ≥90% |
| Group U noContextBleed | ≥90% |
| Live repro | flowers thread → "show me chocolates" → edible chocolates, not bouquets |
