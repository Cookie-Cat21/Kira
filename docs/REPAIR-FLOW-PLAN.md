# Repair Flow Plan

## Problem

When users describe **relationship stress** ("wife is angry", "messed up", "she blocked me"), Kira sometimes:

- Preaches **"go hand-deliver it yourself"** instead of using Kapruka delivery ❌
- Dodges the order ("you should talk to her first") ❌
- Shows no products when they named flowers/chocolates ❌

Kapruka's whole value prop is **send to them when you can't be there**. Getting this wrong kills founder excitement instantly.

## Strategy

### Layer 1 — Prompt + deterministic repair path

- `REPAIR_GIFT_RE` in fast-paths triggers warm friend tone + search when product/city named
- System prompt: never lecture hand-delivery; offer gift message + Kapruka delivery
- `PREACHY_RE` in CEO lens = automatic fail

### Layer 2 — Emotional → action routing

| User gives | Kira does |
|------------|-----------|
| Product + city | Search immediately + delivery check |
| Emotion only | One warm question: what to send + where |
| "blocked on WhatsApp" | Confirm Kapruka can still deliver to address |

### Layer 3 — Automated QA (Group W)

~60 personas (extends Group G):

- Angry wife / gf / partner + city variants
- Apology note + flowers + Colombo
- Anti-hand-deliver traps ("don't tell me to hand deliver")
- Third-party orders ("send to her office")
- Tanglish / machang tone checks

Checks:

- `noHandDeliver` — forbid preachy DIY advice
- `productsOrHonestEmpty` or `asksClarifyingOrProducts`
- `noFamilyUnsafe`
- CEO lens **≥90%**

### Layer 4 — Orchestrator loop

Re-run Group W until ≥90%.

## What we do NOT do

- Play therapist for 5 paragraphs without offering delivery
- Refuse delivery because contact is blocked
- Cold corporate "As an AI…" responses

## Success criteria

| Gate | Target |
|------|--------|
| Group W persona pass | ≥90% |
| Group W noHandDeliver | ≥90% |
| Live | "wife mad send roses Colombo" → products + delivery, no hand-deliver lecture |
