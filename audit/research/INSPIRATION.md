# Design Inspiration Research

**Date:** 2026-06-21  
**Focus:** Patterns directly applicable to Kira's AI shopping concierge

---

## AI shopping assistant

### Macy's "Ask Macy's" / GOAT Assist pattern
- **Source:** Industry case studies (Macy's reported ~4.75× revenue-per-visit for assistant users)
- **Surface:** Chat composer, quick replies
- **Worth adapting:** Predefined intent chips reduce typing; assistant takes actions (search, cart, checkout) not just answers
- **Availability:** Inspiration only
- **Cost:** N/A
- **Difficulty:** Already implemented in Kira
- **Why it helps:** Challenge rewards conversational commerce over catalog browsing

### Shopify Sidekick / AI storefront assistants
- **Source:** https://www.shopify.com/editions (AI commerce patterns)
- **Surface:** Dock placement, product context seeding
- **Worth adapting:** Product click feeds assistant context; recommendations drop into shared cart
- **Availability:** Inspiration only
- **Cost:** Paid platform
- **Difficulty:** Medium — KiraDock already does this on store pages
- **Why it helps:** Proves store + assistant are one product

---

## Gift discovery

### Apple Store gift guides
- **Source:** https://www.apple.com/shop/gift-cards
- **Surface:** Hero, quick suggestions
- **Worth adapting:** Intent-first headlines ("Gifts for…"), minimal chrome, one primary CTA
- **Availability:** Inspiration only
- **Cost:** Free to view
- **Difficulty:** Low — typography + spacing
- **Why it helps:** Premium feel without feature creep

### Aesop gift finder
- **Source:** https://www.awwwards.com/websites/e-commerce/ (dark premium shops)
- **Surface:** Product cards, hero
- **Worth adapting:** Cinematic dark canvas, product imagery as hero, restrained copy
- **Availability:** Inspiration only
- **Cost:** Free gallery
- **Difficulty:** Medium — already aligned with Kira dark gradient
- **Why it helps:** Positions Kapruka as premium, not discount marketplace

---

## Ecommerce cards

### SSENSE / Farfetch minimal grids
- **Source:** https://www.awwwards.com/websites/winner_category_ecommerce/
- **Surface:** Product result cards
- **Worth adapting:** Large product image, price below, minimal metadata, hover lift
- **Availability:** Inspiration only
- **Cost:** Free gallery
- **Difficulty:** Low — ProductCard already close
- **Why it helps:** Clean carousel reads as curated picks, not catalog dump

### Shadcn commerce blocks
- **Source:** https://ui.shadcn.com/blocks
- **Surface:** Product cards, cart
- **Worth adapting:** Accessible card structure, consistent spacing
- **Availability:** Code available (MIT)
- **Cost:** Free
- **Difficulty:** Low
- **Why it helps:** Production-ready primitives

---

## Product quick views

### Apple product modal pattern
- **Source:** https://www.apple.com/ (Quick Look on store)
- **Surface:** ProductQuickView
- **Worth adapting:** Full-screen modal, large image, single primary action, dismiss gesture
- **Availability:** Inspiration only
- **Cost:** Free
- **Difficulty:** Already implemented
- **Why it helps:** Reduces navigation depth vs Kapruka PDP

### Mobbin mobile quick-view patterns
- **Source:** https://mobbin.com/ (e-commerce modals)
- **Surface:** ProductQuickView
- **Worth adapting:** Bottom sheet on mobile, sticky add-to-cart bar
- **Availability:** Inspiration only (paid for full access)
- **Cost:** Freemium
- **Difficulty:** Medium
- **Why it helps:** 375px demo must feel native

---

## Checkout handoff

### Stripe payment link handoff
- **Source:** https://stripe.com/docs/payments/payment-links
- **Surface:** Checkout / pay-link
- **Worth adapting:** Clear "next step" copy, locked price summary, external pay CTA
- **Availability:** Inspiration only
- **Cost:** Free docs
- **Difficulty:** Low — Kira emits payLink SSE event
- **Why it helps:** Diaspora senders need confidence before leaving chat

---

## Mobile bottom sheets

### Vaul drawer examples
- **Source:** https://vaul.emilkowal.ski/
- **Surface:** Cart drawer, Kira dock
- **Worth adapting:** Spring physics, snap points, drag handle
- **Availability:** Code available (MIT)
- **Cost:** Free
- **Difficulty:** Medium — would replace framer-motion slide-over
- **Why it helps:** iOS-native feel for cart and dock

### iOS Maps / Apple Wallet sheet patterns
- **Source:** Apple HIG
- **Surface:** Cart drawer, delivery estimator
- **Worth adapting:** Rounded top corners, backdrop blur, safe-area padding
- **Availability:** Inspiration only
- **Cost:** Free
- **Difficulty:** Low — partial implementation exists
- **Why it helps:** Premium mobile demo at 375px

---

## Order tracking

### Domino's / Uber Eats tracking timelines
- **Source:** https://mobbin.com/ (delivery tracking)
- **Surface:** OrderTracker
- **Worth adapting:** Vertical timeline, status icons, estimated delivery, reorder CTA
- **Availability:** Inspiration only
- **Cost:** Freemium
- **Difficulty:** Low — OrderTracker exists with framer-motion
- **Why it helps:** "track order KP12345" demo must feel trustworthy

---

## Delivery confidence

### Amazon delivery date badges
- **Source:** Industry standard
- **Surface:** Product cards, delivery estimator
- **Worth adapting:** "Delivers tomorrow to Colombo" badge on each card
- **Availability:** Inspiration only
- **Cost:** Free
- **Difficulty:** Low — delivery SSE already exists
- **Why it helps:** Directly addresses Kapruka's late-funnel delivery anxiety

---

## Search / discovery

### Perplexity / ChatGPT product search UI
- **Source:** https://www.awwwards.com/ (AI search interfaces)
- **Surface:** ThinkingLive, product carousel
- **Worth adapting:** Visible tool steps ("Searching Kapruka catalog…"), inline results
- **Availability:** Inspiration only
- **Cost:** Free
- **Difficulty:** Already implemented
- **Why it helps:** Proves MCP integration to judges

---

## Trust and reassurance

### Kapruka MCP portal
- **Source:** https://mcp.kapruka.com/
- **Surface:** McpStatusBadge, header
- **Worth adapting:** Live catalog indicator, transparent rate limits
- **Availability:** Live reference
- **Cost:** Free
- **Difficulty:** Already implemented
- **Why it helps:** Contrast with legacy site — Kira feels 2026

---

## Multilingual / localized UX

### Google / Apple Sinhala typography
- **Source:** Noto Sans Sinhala (already loaded)
- **Surface:** Sinhala mode, chat messages
- **Worth adapting:** Script-aware line height, no layout break on mixed script
- **Availability:** Code available (Google Fonts)
- **Cost:** Free
- **Difficulty:** Low — font already in layout
- **Why it helps:** Sri Lanka market authenticity

---

## Premium hero / visual merchandising

### Apple.com hero choreography
- **Source:** https://www.apple.com/
- **Surface:** Kira hero landing
- **Worth adapting:** Oversized headline, single input, ambient gradient blobs, fade-up animation
- **Availability:** Inspiration only
- **Cost:** Free
- **Difficulty:** Low — already in KiraExperience
- **Why it helps:** First impression for judges

### Lapa Ninja dark landing pages
- **Source:** https://www.lapa.ninja/
- **Surface:** Hero, overall aesthetic
- **Worth adapting:** Dark gradient + glass chips + minimal copy
- **Availability:** Inspiration only
- **Cost:** Free gallery
- **Difficulty:** Low
- **Why it helps:** Validates Kira's dark liquid-glass direction

---

## Sources consulted

| Source | URL | Relevance |
|--------|-----|-----------|
| Awwwards | https://www.awwwards.com/ | E-commerce + dark mode winners |
| Lapa Ninja | https://www.lapa.ninja/ | Dark landing pages |
| One Page Love | https://onepagelove.com/ | Hero patterns |
| Land-book | https://land-book.com/ | E-commerce layouts |
| Godly | https://godly.website/ | Premium web design |
| Mobbin | https://mobbin.com/ | Mobile commerce patterns |
| SaaS Frame | https://www.saasframe.io/ | Dashboard patterns (skipped — not relevant) |
