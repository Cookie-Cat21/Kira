# Vague Intent Plan

## Problem

Kira sometimes **searches and shows products** when the user gave **zero product context**:

- "hi" / "hey" → product carousel or re-intro spam
- "just a gift" / "something" / "I need something" → random Kapruka results
- "under 2000" alone → blind search
- "amma ta" → should ask what to get, not search `q:"gift"`

This feels like a pushy shop bot, not a concierge. Dulith would say: **ask one friendly question first**.

## Strategy

### Layer 1 — Deterministic fast-path guard

In `lib/kira/fast-paths.ts` / `search-fast-paths.ts`:

- Gift fast-path requires budget **OR** occasion **OR** city (not family hint alone)
- Bare budget / bare greeting → fall through to LLM with prompt rule: ask, don't search
- `parseSearchIntent` returns null for referential/vague stripped queries

### Layer 2 — Prompt reinforcement

`lib/kira-prompt.ts` — vague meta-words ("gift", "something") are NOT search queries.

### Layer 3 — Automated QA (Group V)

~60 personas (extends Group A patterns):

- Bare greetings, single words, budget-only, recipient-only
- Romanized Sinhala partial ("amma ta", "gift ekak")
- "something nice", "help me pick something"
- Emoji-only, whitespace

Checks:

- `noPrematureProducts` — no carousel when expect ask
- `asksClarifyingOrProducts` — question OR honest browse if user said "what's popular"
- `noNothingFound` — never "nothing in stock" on vague
- CEO lens **≥90%**

### Layer 4 — Orchestrator loop

Re-run Group V until ≥90%.

## What we do NOT do

- Show bestseller carousel on every greeting
- Return "nothing found" instead of asking
- Ask more than one question at once

## Success criteria

| Gate | Target |
|------|--------|
| Group V persona pass | ≥90% |
| Group V no premature products | ≥90% |
| Live | "just a gift" → clarifying question, no carousel |
