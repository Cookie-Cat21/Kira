# Implementation Source Matching

**Date:** 2026-06-21  
**Principle:** Prefer free/open-source. Paid sources are inspiration only.

| Kira surface | Desired pattern | Best reference | Free implementation source | Package/component | Effort | Risk | Notes |
| ------------ | --------------- | -------------- | -------------------------- | ----------------- | ------ | ---- | ----- |
| Home / hero | Cinematic dark hero + fade-up | Apple.com, Lapa Ninja | Existing `KiraExperience` + `globals.css` animations | `animate-fade-up`, gradient blobs | 1 | 1 | Already shipped |
| Chat composer | Premium input + language toggle | GOAT Assist, shadcn | `app/components/ui/kira-chat-input.tsx` | Custom component | 1 | 1 | EN/SI/TA toggle exists |
| Quick suggestions | Intent chips | Macy's Ask, Perplexity | `QuickReplies.tsx`, hero chips in `KiraExperience` | Custom | 1 | 1 | Starter prompts + occasion chips |
| Gift brief chips | Context rail (city/date/budget) | Apple Wallet chips | `CommerceRail.tsx` + `lib/commerce-context.ts` | Custom | 2 | 1 | Wired this session |
| Product cards | Dark glass cards + delivery badge | SSENSE, shadcn blocks | `ProductCard.tsx` | Custom + Tailwind | 2 | 1 | Add delivery badge from SSE |
| Product carousel | Horizontal scroll + snap | Embla examples | **Embla Carousel** | `embla-carousel-react` | 2 | 2 | Optional upgrade from CSS scroll |
| Product quick view | Full-screen modal | Apple Quick Look | `ProductQuickView.tsx` | framer-motion | 1 | 1 | Already shipped |
| Category rails | Glass chip scroll | shadcn + Magic UI | `CategoryRail.tsx`, `glass-chip` CSS | Custom | 1 | 1 | Store only |
| Cart drawer | Slide-over tray | Vaul, shadcn Sheet | `CartDrawer.tsx` | framer-motion | 2 | 1 | Could migrate to Vaul later |
| Mobile bottom sheet | Spring drawer | Vaul | **vaul** | `@/components/ui/drawer` (shadcn) | 3 | 2 | Future P2 — dock + cart |
| Delivery estimator | Date picker + city + fee | Amazon badges | `CityPicker`, `DeliveryDatePicker`, SSE `delivery` | Custom | 2 | 1 | CommerceRail syncs city/date |
| Checkout handoff | Pay link + summary | Stripe links | `CheckoutModal.tsx` + SSE `payLink` | Custom | 2 | 2 | Real MCP order creation |
| Order tracking | Vertical timeline | Mobbin delivery apps | `OrderTracker.tsx` | framer-motion | 1 | 1 | Fast-path `KP12345` |
| Loading / thinking | Step list + skeleton | Perplexity | `ThinkingBlock.tsx` | Custom | 1 | 1 | Shows MCP tool steps |
| Error / no-results | Retry + alternatives | ChatGPT error UX | `ResponseStatusBanner` | Custom | 1 | 1 | Retry/alternatives/cancel |
| Sinhala / locale | Script-aware typography | Noto Sans Sinhala | `next/font` in `layout.tsx` | Google Fonts | 1 | 1 | SI/TA modes in API |
| Mobile dock | Corner launcher + slide-over | Shopify Sidekick | `KiraDock.tsx` | framer-motion | 2 | 1 | Full-width on mobile |
| MCP status | Live indicator | mcp.kapruka.com | `McpStatusBadge.tsx` | Custom fetch | 1 | 1 | Proves real integration |
| Animations | Staggered reveals | GSAP ScrollTrigger | **gsap** (already installed) | `StoreHero.tsx` | 2 | 1 | Store pages only |
| Glass material | Frosted nav/cards | Magic UI, shadcn | `globals.css` `.liquid-glass-nav`, `.glass-chip` | CSS | 1 | 1 | No new dependency |
| Fly-to-cart | Arc animation | HyperUI commerce | `CartContext.triggerFly` | framer-motion | 1 | 1 | Already shipped |
| Accessibility | Focus trap, ARIA | Radix primitives | **@radix-ui/react-dialog** (via shadcn) | shadcn Dialog | 3 | 2 | Future — modals are custom |
| Cart persistence | localStorage sync | Standard pattern | `CartContext.tsx` | Custom | 1 | 1 | Added this session |

---

## Package recommendations (not yet installed)

| Package | Use case | Install command | Priority |
|---------|----------|-----------------|----------|
| `vaul` | Mobile bottom sheets for cart/dock | `npx shadcn@latest add drawer` | P2 |
| `embla-carousel-react` | Product carousel polish | `npm i embla-carousel-react` | P2 |
| `@radix-ui/react-dialog` | Accessible modals | via shadcn | P2 |

**Decision:** Do not add heavy dependencies this session. Existing framer-motion + CSS glass system is sufficient for SHIP-grade demo.

---

## HyperUI / Preline / Flowbite — commerce blocks referenced

| Block type | Source | Kira equivalent |
|------------|--------|-----------------|
| Product card grid | HyperUI e-commerce | `StoreProductCard.tsx` |
| Cart sidebar | Flowbite drawer | `CartDrawer.tsx` |
| Timeline | Preline timeline | `OrderTracker.tsx` |
| Input group | shadcn Input | `kira-chat-input.tsx` |

All equivalents already exist as custom components — no copy-paste needed.
