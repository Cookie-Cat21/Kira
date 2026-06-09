# Kapruka × Kira — Design Direction

**Goal:** Redesign the Kapruka storefront to an Apple-grade, dark "liquid-glass" experience, with Kira (the AI assistant) docked inside it. This document synthesizes 2026 award-gallery research into concrete, build-ready decisions.

> Status: living brief. Trend synthesis done (web research). Live reference screenshots pending Chrome connection — see `references.md` and the `screenshots/` subfolders.

---

## 1. The core idea

The current kapruka.com is a dense, bright, icon-grid marketplace — functional but busy. We invert it: a calm, cinematic, dark canvas where **product imagery and motion do the talking**, and Kira is always one tap away. The store and the assistant are one product, sharing one cart.

The north star: *it should feel less like a shopping site and more like a directed experience* — which is exactly what 2026 award galleries reward (Awwwards, Top CSS Gallery, ecomdesignawards).

---

## 2. What the research says (and what we take from it)

**Glassmorphism has matured — use it as accent, not everywhere.**
The 2026 consensus is glass-as-accent: nav bars, cards, overlays, the Kira dock — not full-screen frosted soup. We already have a strong `liquid-glass-nav` material in `globals.css`; we extend that vocabulary to cards and the dock, but keep large surfaces solid/cinematic.
→ *Decision:* glass for floating chrome (nav, dock, cards-on-hover, modals). Solid dark gradient for page backgrounds.

**Dark mode is now "cinematic," not just dark.**
Award-winning dark UIs pair a rich, slightly-colored background with luminous accents, vivid-but-restrained gradients, soft lighting, and carefully balanced contrast so imagery pops.
→ *Decision:* keep the existing `#0d0818 → #1a0f33 → #0f1629` gradient base; add ambient radial "blobs" (already in the Kira page) on the storefront; let product photos sit on near-black cards so colors glow.

**Scroll-driven, story-led motion is table stakes.**
Every 2026 award site uses intentional scroll motion — staggered reveals, parallax, physics-based smooth scroll (Lenis + GSAP ScrollTrigger), not 2019-era slide-ins.
→ *Decision:* GSAP + ScrollTrigger for the hero timeline and section reveals; staggered product-card entrances; subtle parallax on hero imagery. Respect `prefers-reduced-motion`.

**Conversational commerce converts.**
Macy's "Ask Macy's" reported revenue-per-visit ~4.75× higher for assistant users; the pattern that wins is natural-language intent over rigid navigation, with the assistant able to *take actions* (search, check delivery, add to cart, checkout).
→ *Decision:* Kira isn't a help bubble — it's a primary entry point. Dock it prominently; let product clicks feed Kira context and let Kira recommendations drop into the shared cart.

**Premium chat UI = clean, high-contrast, low-friction.**
Reference patterns (GOAT Assist, etc.): black background, white text, predefined quick-reply chips to reduce typing friction, generous spacing.
→ *Decision:* our existing Kira UI already matches this. We reuse it verbatim in the dock (`embedded` variant) so the brand voice is identical in both surfaces.

---

## 3. Design system (concrete tokens)

Built on the existing `@theme` tokens in `app/globals.css` — we extend, not replace.

**Color**
- Canvas: `#0d0818 → #1a0f33 → #0f1629` (135° gradient, fixed attachment)
- Brand: `kap-purple #402970`, `kap-yellow #f8da08` (accents/CTAs only — used sparingly so they read as premium, not loud)
- Glass surface: `rgba(255,255,255,0.06–0.08)` + `blur(30–48px) saturate(180–220%)`
- Text ramp: white at 92% / 65% / 40% (primary / secondary / muted)
- Accent glow: leaf-green `#4ade80` for "live/in-stock", rose `#f9a8d4` for soft highlights

**Type**
- Display: DM Serif Display (already loaded) — big editorial hero headlines
- Body/UI: SF Pro / system stack (already configured)
- Sinhala: Noto Sans Sinhala (already loaded)
- Scale: oversized hero (clamp 3–6rem), confident section headers, restrained body

**Material vocabulary**
- `liquid-glass-nav` — top nav + Kira dock header (already exists)
- `glass-chip` — category pills, filters (already exists)
- New `glass-card` — product cards: near-black base, glass border, glow + lift on hover

**Motion**
- Smooth scroll (Lenis), GSAP ScrollTrigger reveals, staggered grids
- Hover: scale 1.02–1.04 + purple glow shadow `0 8px 32px rgba(64,41,112,0.4)`
- "Fly to cart" arc already implemented in `CartContext` — reuse on storefront cards

**Spacing & layout**
- Generous whitespace (Apple-grade air), max-w ~1280px content, full-bleed hero
- 8px grid; large tap targets; rounded-2xl cards

---

## 4. Page-by-page intent

**Home** — Full-bleed cinematic hero (headline + one-line value prop + Kira CTA), GSAP intro timeline. Below: horizontally-scrolling category rail (glass chips with icon), then editorial product rails ("Trending today", "Fresh from the bakery", "Gifts under LKR 5,000"), each revealing on scroll. A standout "Meet Kira" band inviting users to shop by conversation.

**Shop / category** — Calm filterable grid of `glass-card` products, sticky glass filter bar, staggered entrance, infinite/又 load-more.

**Product detail** — Cinematic: large image (parallax), editorial typography for name/price, variants + add-ons, delivery check, "Add to cart" with the fly animation, "Ask Kira about this" button that opens the dock pre-seeded with the product.

**Kira dock** — Floating glass launcher (bottom-right). Opens a right-side slide-over (desktop) / full-sheet (mobile) rendering the existing Kira experience embedded. Shares the global cart, so anything Kira adds shows in the same bag.

---

## 5. Reference capture plan

See `references.md`. Once Chrome is connected I'll screenshot curated examples into:
`screenshots/awwwards`, `/dribbble`, `/pinterest`, `/apple`, `/ecommerce`, `/kira-assistant` — each with a short note on *what* to steal (layout, motion, spacing, color) recorded back into this doc under "Annotated references."

---

## 5b. Annotated references (live review, Awwwards ecommerce winners)

Reviewed the Awwwards "Top E-commerce Sites" gallery live. The standout, on-direction winners and what we borrow:

- **Karan Chouhan (dark fashion)** — full-bleed product/figure floating on near-black, ultra-minimal ghosted nav, tiny mono labels in the corners. *Borrow:* near-black product canvas so the subject glows; restrained, low-opacity chrome. Already reflected in `store-card` + the dark canvas; reinforces keeping nav text at ~65% white.
- **CANCAN Furnishings (dark editorial)** — "Shop Bestsellers" with large imagery, generous gutters, serif/sans mix. *Borrow:* editorial product rails with big type headers (our `ProductRail` + `display-hero`), lots of air between sections.
- **Gielly Green / Drop Edition** — oversized display typography as the hero device (huge serif words doing the work). *Borrow:* our DM Serif `display-hero` at clamp 5–7rem in the hero — validated direction.
- **Lab46 "Intimate Science"** — cinematic product hero with a single confident headline + one CTA. *Borrow:* product detail page keeps one dominant image + minimal, decisive actions (matches `ProductDetailClient`).
- **Belle Oaks** — soft cinematic imagery, italic serif accents. *Borrow:* italic serif accent for category eyebrows / blurbs.

Net: the build already aligns with the winning patterns. Concrete refinements queued from this review: (1) push hero headline larger and tighten tracking, (2) increase vertical rhythm between rails, (3) keep nav chrome lower-contrast until scroll. These are low-risk polish, not rework.

## 6. Sources (trend research)

- Awwwards — Glassmorphism & ecommerce winners: https://www.awwwards.com/websites/winner_category_ecommerce/
- Top CSS Gallery — Trends dominating award galleries 2026: https://www.topcssgallery.com/blog/web-design-trends-dominating-award-galleries/
- Studio Meyer — Web design trends 2026 reality check: https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check
- Onyx8 — Glassmorphism examples 2026: https://onyx8agency.com/blog/glassmorphism-inspiring-examples/
- Awwwards — Best GSAP sites: https://www.awwwards.com/websites/gsap/
- Animation Addons — GSAP ScrollTrigger examples: https://animation-addons.com/blog/gsap-scrolltrigger-examples/
- Algolia — AI shopping assistants guide: https://www.algolia.com/blog/ecommerce/ai-shopping-assistants
- Retail Dive — Ask Macy's conversational assistant: https://www.retaildive.com/news/ask-macys-AI-conversational-shopping-assistant/815928/
