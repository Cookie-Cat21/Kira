# Kira E2E Test Master Plan
**Date:** 2026-06-05  
**Branch:** feat/agent-harness-v2  
**Tester:** Claude (automated browser sessions)  
**Issue tracker:** Cookie-Cat21/Kira on GitHub

---

## Overview

This plan exercises Kira through 15 realistic user personas — each with a distinct intent, cultural context, and device profile. Every persona runs as an independent session. Bugs are filed as GitHub issues immediately after discovery, tagged by severity: `[P0]` blocker · `[P1]` major · `[P2]` minor · `[P3]` polish.

**Coverage matrix:**

| Flow | Personas covering it |
|---|---|
| Cold open / greeting | All |
| Conversational search | 1, 2, 3, 5, 7, 9, 11, 12, 14 |
| Category browse | 4, 6, 13 |
| Product quickview | 2, 5, 8, 10 |
| Add to cart | 2, 5, 8, 10, 12, 15 |
| Cart drawer | 8, 10, 12, 15 |
| Delivery quote | 1, 3, 8, 10, 12 |
| Checkout modal + pay link | 3, 10, 15 |
| Order tracking | 6, 14 |
| Sinhala mode | 7, 13 |
| Tanglish (Sri Lankan register) | 1, 2, 4, 9, 11 |
| Mobile viewport (375px) | 4, 6, 9, 13 |
| Error / edge case | 11, 14 |
| Occasion awareness (Vesak / wedding) | 3, 5, 12 |

---

## Personas

---

### Persona 1 — Nimal, 34, Colombo 7
**Profile:** Software engineer, busy, buying a birthday cake for his wife who's in Kandy this weekend. Moderate tech literacy. Speaks Tanglish casually.  
**Device:** Desktop, Chrome, 1440px  
**Intent:** Find a birthday cake, check delivery to Kandy, buy it.

**Conversation script:**
1. Cold open — reads greeting, notes if it's contextually relevant
2. `"my wife's birthday is on Saturday, she's in Kandy — can you help me find a cake to send her?"`
3. Scrolls product carousel, taps a product card to quickview
4. `"how much will delivery cost to Kandy?"`
5. `"add that to cart"` → checks cart drawer opens
6. `"ok I want to buy this"` → checkout flow

**What to observe:**
- Does the greeting feel warm and contextual (not robotic)?
- Does the product carousel render cleanly with images + prices?
- Does delivery quote show fee + perishable warning if applicable?
- Does Add to Cart work from both chat and quickview?
- Does checkout modal open and pre-fill correctly?
- Is the pay link returned and clickable?

**Known risk:** Delivery to Kandy specifically — check if `get_delivery_quote` handles outstation cities.

---

### Persona 2 — Priya, 28, London (diaspora)
**Profile:** Sri Lankan living in the UK. Wants to send a New Year (Avurudu) hamper to her parents in Nugegoda. Slightly formal English.  
**Device:** Desktop, 1280px  
**Intent:** Buy a gift hamper, check that delivery to Nugegoda works, complete checkout.

**Conversation script:**
1. Cold open
2. `"I want to send an Avurudu gift hamper to my parents in Nugegoda, what do you have?"`
3. Reads product results, asks `"can you tell me more about the second one?"`  → tests quickview via chat reference
4. `"is it available for delivery to Nugegoda?"`
5. `"ok add it to cart and show me how to checkout"`
6. Completes checkout modal

**What to observe:**
- Does Kira understand "Avurudu" as a cultural occasion and use it in her response?
- Does she reference "second one" correctly (contextual memory)?
- Does the delivery quote come back for Nugegoda?
- Is the checkout summary (product + delivery fee + total) shown clearly before pay link?

---

### Persona 3 — Chamara, 45, Gampaha
**Profile:** Father of the bride, looking for wedding-related items — specifically a floral arrangement or wedding cake. Moderate English, older user pattern (slower, re-reads things).  
**Device:** Desktop, 1920px  
**Intent:** Browse wedding items, check delivery to Gampaha, complete a purchase.

**Conversation script:**
1. Cold open — notes if occasion awareness is shown (wedding season awareness)
2. `"I need something nice for a wedding next weekend in Gampaha"`
3. `"show me flower arrangements"` — tests category-specific search
4. `"what's the price of that one?"` (tap specific card)
5. `"add the first one to cart"` → cart drawer
6. `"checkout"` → full checkout flow

**What to observe:**
- Does Kira recognise "wedding" and respond with relevant tone/context?
- Flower arrangements: do images load? Are prices correct?
- Does checkout work end-to-end (most important flow for rubric)?

---

### Persona 4 — Sachini, 22, Moratuwa (mobile)
**Profile:** University student. Casual phone browser. Wants to buy chocolates as a thank-you gift for a lecturer. Very casual Tanglish. Tests mobile viewport.  
**Device:** Mobile 375px (iPhone 14 sim)  
**Intent:** Quick buy of chocolates, no long conversation, impulse purchase.

**Conversation script:**
1. Cold open (mobile) — check greeting fits on screen, no overflow
2. `"chocolates for a gift lah, what's good?"`
3. Taps product card directly (not via chat)
4. `"add to cart"` from quickview
5. `"how do I pay"` → checkout

**What to observe:**
- Does the chat UI scroll properly on mobile?
- Does the product carousel show cards without horizontal scroll breaking?
- Is the floating cart button visible above keyboard?
- Does the checkout modal render correctly at 375px?
- Are touch targets big enough (>44px)?

---

### Persona 5 — Rohan, 31, Kandy
**Profile:** Romantically motivated — anniversary coming up. Wants to send roses or a gift to his girlfriend in Colombo 5. Speaks Sri Lankan casual English.  
**Device:** Desktop 1440px  
**Intent:** Find roses or romantic gift, check delivery to Colombo, add to cart.

**Conversation script:**
1. Cold open
2. `"our anniversary is next week, want to send roses to my girlfriend in Colombo 5"`
3. `"show me the nicest ones"` → tests if Kira sorts/recommends
4. Taps quickview on top card, reads description
5. `"delivery to Colombo 5 by Friday?"`
6. `"add it"` → cart → `"checkout"`

**What to observe:**
- Does Kira respond with appropriate romantic warmth?
- Does delivery quote show next-available date clearly?
- Does quickview image render (some flower images fail)?
- Does the checkout total look correct?

---

### Persona 6 — Dilrukshi, 55, Negombo
**Profile:** Mother, not tech-savvy. Wants to track an order she placed last week for her son's birthday. Uses simple phrases. Tests the **order tracking** flow.  
**Device:** Mobile 390px  
**Intent:** Track existing order.

**Conversation script:**
1. Cold open (mobile)
2. `"I placed an order last week, how do I check it?"`
3. Kira asks for order ID → user provides `"KAP123456"` (synthetic test ID)
4. `"when will it arrive?"`

**What to observe:**
- Does Kira smoothly ask for order ID without being robotic?
- Does `track_order` get called with the provided ID?
- If order ID doesn't exist (404), does Kira handle gracefully without raw error?
- Does the `OrderTracker` timeline component render on mobile?

---

### Persona 7 — Kasun, 26, Galle
**Profile:** Native Sinhala speaker. Types entirely in Sinhala unicode. Tests **Sinhala mode** gating.  
**Device:** Desktop 1280px  
**Intent:** Browse cakes, check if Kira replies in Sinhala.

**Conversation script:**
1. Cold open (in English — check if greeting language is correct)
2. `"කේක් එකක් ගන්න ඕනෙ, birthday gift එකක්"` — mixed Sinhala + English
3. Pure Sinhala: `"ඩිලිවරි ගාන කීයද?"`

**What to observe:**
- Does Kira correctly detect Sinhala unicode and switch mode?
- Is the Sinhala response grammatically sound (flag for native review)?
- Does Kira NOT switch to Sinhala if the user just says "Vesak" in English?
- Do products still render normally in Sinhala conversation?

---

### Persona 8 — Tharushi, 29, Colombo 3
**Profile:** Event planner, very professional. Wants to compare multiple products across categories, add several to cart, then checkout with the most expensive total. Tests **multi-item cart** flow.  
**Device:** Desktop 1440px  
**Intent:** Multiple adds, see cart total update, checkout.

**Conversation script:**
1. `"show me cakes"`
2. Adds first cake to cart
3. `"now show me chocolates"`
4. Adds a chocolate box to cart
5. Opens cart drawer — checks quantity badges and total
6. Removes one item from cart
7. `"checkout the remaining items"`

**What to observe:**
- Does cart total recalculate correctly on add/remove?
- Is the floating cart button badge count correct?
- Can checkout handle multiple line items?
- Is the UI state consistent (no stale cart renders)?

---

### Persona 9 — Supun, 19, Kurunegala (mobile)
**Profile:** Teenager, first-time user, extremely casual. Types fast, abbreviated messages. Stress-tests **input handling** and **short prompts**.  
**Device:** Mobile 375px  
**Intent:** Find something random, add to cart.

**Conversation script:**
1. Cold open
2. `"hi"` (minimal greeting — does Kira not freeze?)
3. `"cakes lol"`
4. `"first one add"` — ambiguous reference
5. `"cart"`
6. `"nvm forget it"` — abandons (does state reset cleanly?)

**What to observe:**
- Does Kira handle single-word messages gracefully?
- Does `"first one add"` resolve correctly or confuse the model?
- Does "nvm forget it" not produce an error or hallucinated response?
- Any infinite loading states after ambiguous messages?

---

### Persona 10 — Malini, 38, Colombo 6
**Profile:** Meticulous shopper. Wants the complete "happy path" — greeting → search → quickview → delivery quote → add to cart → checkout → pay link. Full end-to-end golden path. Desktop.  
**Device:** Desktop 1440px  
**Intent:** Complete golden path purchase, screenshot every step.

**Conversation script:**
1. Cold open — read full greeting
2. `"I want to buy a birthday cake for delivery to Colombo 6"` (most complete initial query)
3. Product carousel renders → click first card → quickview opens
4. Close quickview → `"add this to cart"` (after quickview close — tests state persistence)
5. `"get me a delivery quote for Colombo 6"`
6. `"I'm ready to checkout"`
7. Fill checkout form → get pay link
8. Click pay link (note: don't complete payment)

**What to observe:**
- This is the money flow — document every step with screenshot
- Is the total correct (product + delivery)?
- Does the pay link open in a new tab?
- Any visual glitches in the checkout modal?
- Is the guest name / delivery address carried through correctly?

---

### Persona 11 — Anushka, 24, Matara (mobile)
**Profile:** Curious, skeptical user. Asks off-topic questions, tries to break Kira. Tests **robustness and hallucination prevention**.  
**Device:** Mobile 390px  
**Intent:** Stress-test unusual inputs.

**Conversation script:**
1. Cold open
2. `"what's the weather like in Colombo?"` (off-topic)
3. `"can you book me a flight to Singapore?"` (out of scope)
4. `"show me iPhones on Kapruka"` (tests if Kira searches and returns real results vs hallucinated)
5. `"that product doesn't exist, you're making it up"` (adversarial)
6. `"ok fine, just show me something under Rs. 500"`

**What to observe:**
- Does Kira politely redirect off-topic questions without breaking?
- Does it say "I can't help with flights" gracefully?
- Does the iPhone search return real results or hallucinated ones?
- Does Kira handle `"under Rs. 500"` price filtering? (MCP may not support this — does Kira say so honestly?)
- No "As an AI language model" responses allowed

---

### Persona 12 — Buddhika, 42, Batticaloa
**Profile:** Outstation user, wants to test delivery to a less-common city. Practical, terse English. Tests **delivery to smaller cities**.  
**Device:** Desktop 1280px  
**Intent:** Buy a birthday cake, check delivery to Batticaloa.

**Conversation script:**
1. Cold open
2. `"birthday cake to Batticaloa, is it possible?"`
3. `"how much does delivery cost?"`
4. `"when is the earliest delivery date?"`
5. If available: `"add to cart and checkout"`

**What to observe:**
- Does `get_delivery_quote` work for Batticaloa?
- If delivery is NOT available, does Kira give a helpful alternative (e.g., "try a hamper which ships anywhere")?
- Is the `next_available_date` shown clearly in the delivery result?
- No raw MCP error objects shown to the user

---

### Persona 13 — Nethmi, 17, Colombo 15 (mobile)
**Profile:** Gen-Z, very visual. Wants to browse categories, not search. Tests **category browse flow**. Mobile.  
**Device:** Mobile 375px  
**Intent:** Browse categories, discover products visually.

**Conversation script:**
1. Cold open (mobile)
2. `"what categories do you have?"` — triggers `get_categories`
3. `"show me what's in the flowers section"`
4. Taps product card from carousel
5. `"I want to see more flowers"`

**What to observe:**
- Does the category list render cleanly in chat?
- Is the second `"show me flowers"` search using a correct category filter?
- On mobile, are category chips or inline lists readable?
- Does "I want to see more" correctly re-query or show pagination behavior?

---

### Persona 14 — Ashan, 33, Dehiwala
**Profile:** Repeat customer, comes back to track an order and also place a new one. Tests **session context continuity** — tracking in one part of conversation, then shopping in another.  
**Device:** Desktop 1280px  
**Intent:** Track order, then buy something new in same session.

**Conversation script:**
1. `"I want to track my order KAP789012"`
2. Reads tracking timeline
3. `"also I want to order flowers for my mum"`
4. Adds flowers, `"add to cart"`
5. `"checkout"`

**What to observe:**
- Does context switch (tracking → shopping) cause any state corruption?
- Are two separate tool flows handled cleanly in one session?
- Does the ThinkingBlock show both tool call sequences without mixing them?
- Is the cart empty at the start of the new purchase (no cart bleed from prior tracking)?

---

### Persona 15 — Shehan, 27, Mount Lavinia
**Profile:** Last-minute shopper, impatient. Wants to complete checkout as fast as possible. Tests **speed of happy path** and whether Kira's deterministic fast-path shortcut activates.  
**Device:** Desktop 1440px  
**Intent:** Fastest possible purchase. Tests the `tryHandleDeterministicPrompt` fast-path.

**Conversation script:**
1. Skips reading greeting immediately
2. `"show me cakes on Kapruka"` (deterministic fast-path trigger phrase)
3. Immediately clicks "Add to Cart" on first card (no chat message)
4. `"ready to checkout"` (another deterministic trigger)
5. Fills form quickly, gets pay link

**What to observe:**
- Does `"show me cakes on Kapruka"` bypass the LLM and go direct to MCP? (Check ThinkingBlock — should show 0 LLM calls or instant response)
- Does `"ready to checkout"` also hit the fast-path?
- Total time from message to carousel: should be < 2s for fast-path
- Does the checkout flow still work correctly via fast-path? (Regression risk)

---

## Severity Definitions

| Level | Description | Examples |
|---|---|---|
| P0 | Blocks core purchase flow | Checkout crashes, pay link never returned, cart empties on refresh |
| P1 | Major UX degradation | Product images 404, delivery quote missing, Kira hangs indefinitely |
| P2 | Noticeable but workaround exists | Wrong text, misaligned layout, wrong price format |
| P3 | Polish | Animation glitch, font mismatch, minor copy issue |

---

## GitHub Issue Template

```
**Persona:** [N — Name]
**Flow:** [What was being tested]
**Message sent:** `[exact text]`

## What happened
[Observed behavior]

## What should happen
[Expected behavior]

## Screenshot
[Attached]

## Severity
[P0/P1/P2/P3]
```

---

## Execution Order

1. **Persona 10** (golden path) — establishes baseline
2. **Persona 1, 2, 3** — core gifting flows, desktop
3. **Persona 4, 6, 9, 13** — mobile sessions
4. **Persona 15** — fast-path perf test
5. **Persona 7** — Sinhala mode
6. **Persona 8** — multi-item cart
7. **Persona 11** — adversarial/robustness
8. **Persona 5, 12, 14** — edge location / context switch
9. **Persona 6** — order tracking
