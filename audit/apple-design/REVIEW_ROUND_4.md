# Apple Design Review — Kira (Post Light Migration Fix)

**Date:** 2026-06-21  
**Repo:** Kira / Kapruka  
**Stack:** Next.js 16 · React · Tailwind v4 · shadcn  
**Scope:** Full app — `/`, `/shop`, `/product`, `/track`  
**Viewports:** 375 / 1280 · **Theme:** light

**Overall:** **94 / 100 (A) · Verdict: SHIP**

| Round | Score | Notes |
|-------|-------|-------|
| R0 Purpose | 92 | Full-screen Kira at `/`; store defers to chat; one primary CTA per viewport |
| R1 Wayfinding | 93 | GiftFinder sentence builder; dock → `/` (no drawer); PDP has inline Ask Kira |
| R2 Agency | 94 | Thinking steps readable; order summary legible; error recovery with actions |
| R3 Craft | 94 | Light migration complete; glass on nav only; semantic text hierarchy |
| R4 Flexibility | 93 | 44px primary targets; full-screen at all widths; reduced-motion in globals |

## Discovery summary

| Surface | Key paths | Primary job |
|---------|-----------|-------------|
| Chat | `KiraExperience.tsx`, `/` | Find gift, check delivery, checkout |
| Store | `GiftFinder`, `StoreNav`, `/shop` | State intent → open Kira |
| PDP | `ProductDetailClient`, `/product/[id]` | Evaluate product → bag or Ask Kira |
| Track | `TrackOrderClient`, `/track` | Track order via Kira |

## P0 — 0 open

All prior P0 contrast regressions fixed:
- StickyOrderSummary white-on-white text
- CommerceRail ghost chips invisible on light rail
- ChatMessage ProductHero / CheckoutCard dark glass
- ThinkingBlock unreadable steps
- PDP Add to bag white-on-white

## P1 — 0 open (ship gate met)

Fixed in this round:
- CityPicker, McpStatusBadge popovers → light
- KiraLoader splash → light canvas (no whiplash)
- KiraBand gradient CTA → solid purple
- PDP category badge → kap-purple (WCAG AA)
- Floating dock hidden on `/product` (PDP has dedicated CTA)
- ProductCardSkeleton → light store-card pattern

## P2 backlog

- CheckoutModal full token pass (scrim blur acceptable for modal)
- `liquid-glass` demo route in prod tree
- Global `bg-[#f5f5f7]` → `bg-kira-bg` token sweep
- Route-level `error.tsx`

## Strengths

- Full-screen immersive chat — challenge requirement met
- Apple sentence builder on `/shop` with single filled CTA
- shadcn primitives on store/track surfaces
- MCP thinking transparency with readable light steps
- Cart unified across chat + store

## Inevitability

A diaspora sender lands on Kapruka, states intent in one sentence or one chat line, and Kira handles catalog → delivery → checkout without fighting the UI. Chrome recedes; the task dominates. Remaining debt is token consistency, not architecture.

## Fixes applied (Round 4)

1. CommerceRail — full light chip system
2. ThinkingBlock — kira-text hierarchy, no backdrop blur on avatar
3. ChatMessage — ProductHero/CheckoutCard/carousel arrows light
4. KiraExperience — StickyOrderSummary, GROQ banner, error retry
5. ProductDetailClient — purple primary CTA, light reassurance cards
6. CityPicker, McpStatusBadge — white popovers
7. KiraLoader — light splash
8. KiraBand — white card, solid CTA
9. KiraDock — hidden on product pages
