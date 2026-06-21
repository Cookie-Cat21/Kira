# Kira Current State — Structure Audit

**Audit date:** 2026-06-21  
**Branch:** `cursor/kira-grind-upgrade-3be4` (post P0 fix)

---

## Route / component map

| Route | File | Surface | Status |
|-------|------|---------|--------|
| `/` | `app/page.tsx` | Full-screen `KiraExperience` | **Fixed** — was storefront-only (P0) |
| `/shop` | `app/shop/page.tsx` | Storefront home | Implemented |
| `/shop/[slug]` | `app/shop/[slug]/page.tsx` | Category grid | Implemented |
| `/product/[id]` | `app/product/[id]/page.tsx` | Product detail | Implemented |
| `/kira` | `app/kira/page.tsx` | Redirect → `/` | Implemented |
| `/liquid-glass` | `app/liquid-glass/page.tsx` | Glass UI kit demo | Implemented |

### Global layout (`app/layout.tsx`)

- `CartProvider` — shared cart (now persisted to `localStorage`)
- `KiraDockProvider` — dock state + product seeding
- `CartDrawer` — gift tray slide-over
- `FloatingCartButton` — fly-to-cart target
- `KiraDock` — corner launcher on `/shop`, `/product/*` only

### API routes

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/chat` | `app/api/chat/route.ts` | SSE agent loop (Groq + MCP) |
| `POST /api/checkout` | `app/api/checkout/route.ts` | MCP order creation |
| `GET /api/products/[id]` | `app/api/products/[id]/route.ts` | Product quick view |
| `GET /api/delivery-cities` | `app/api/delivery-cities/route.ts` | City picker data |
| `GET /api/mcp-status` | `app/api/mcp-status/route.ts` | Health badge |
| `GET /api/health` | `app/api/health/route.ts` | Test preflight |
| `GET /api/store/*` | `app/api/store/**` | Storefront catalog |

---

## Component inventory

### Chat / commerce core

| Component | Path | States |
|-----------|------|--------|
| `KiraExperience` | `app/components/KiraExperience.tsx` | Splash, hero, streaming, error, session restore |
| `KiraLoader` | `app/components/KiraLoader.tsx` | 2.5s intro (skipped when embedded) |
| `ChatMessage` | `app/components/ChatMessage.tsx` | Products, delivery, checkout, tracking |
| `ProductCard` | `app/components/ProductCard.tsx` | Card + skeleton |
| `ProductQuickView` | `app/components/ProductQuickView.tsx` | loading / ready / error |
| `OrderTracker` | `app/components/OrderTracker.tsx` | Timeline + reorder |
| `ThinkingBlock` | `app/components/ThinkingBlock.tsx` | ThinkingLive + ThinkingDone |
| `QuickReplies` | `app/components/QuickReplies.tsx` | Context action chips |
| `CommerceRail` | `app/components/CommerceRail.tsx` | Gift brief chips — **now wired** |
| `CityPicker` | `app/components/CityPicker.tsx` | MCP cities + fallback |
| `CheckoutModal` | `app/components/CheckoutModal.tsx` | 3-step checkout |
| `CartDrawer` | `app/components/CartDrawer.tsx` | Empty + items |
| `McpStatusBadge` | `app/components/McpStatusBadge.tsx` | up / degraded / down |

### Store components (`app/components/store/`)

| Component | Role |
|-----------|------|
| `KiraDock` | Slide-over launcher (hidden on `/`) |
| `StoreNav` | Sticky nav + search + cart |
| `StoreHero` | GSAP hero |
| `KiraBand` | "Meet Kira" CTA band |
| `CategoryRail` / `ProductRail` | Editorial merchandising |
| `ShopGrid` | Category pagination |
| `ProductDetailClient` | PDP + "Ask Kira" seeding |

### Key lib files

| File | Role |
|------|------|
| `lib/kira-prompt.ts` | System prompt + greetings |
| `lib/kira-client.ts` | Client-safe greeting/chips |
| `lib/mcp-client.ts` | MCP connection |
| `lib/mcp-parsing.ts` | Response extraction |
| `lib/commerce-context.ts` | **New** — gift brief chip extraction |
| `lib/catalog.ts` | Store catalog |
| `types/index.ts` | Shared interfaces |

---

## Implemented states

| Surface | Loading | Error | Empty |
|---------|---------|-------|-------|
| Kira chat | KiraLoader, ThinkingLive, skeletons | ResponseStatusBanner + retry | Hero + starter chips |
| ProductQuickView | Spinner | Error + close | — |
| CartDrawer | — | — | "Your tray is empty" |
| CheckoutModal | Placing spinner | placeError | Empty review guard |
| ShopGrid | Load-more | Silent | "Nothing here yet" |
| CityPicker | Loader | Static fallback | "No match" |
| McpStatusBadge | Checking | Down state | — |

---

## Missing states

- Global `error.tsx` / `not-found.tsx` / `loading.tsx`
- Prominent `GROQ_API_KEY` missing warning on client
- File attachments in chat input (UI only, not sent)
- Product variants/addons on store PDP

---

## Known broken states (pre-fix)

| Issue | Severity | Status |
|-------|----------|--------|
| `/` rendered storefront, no Kira | P0 | **Fixed** |
| `KiraDock` null on `/` broke "Ask Kira" CTAs | P0 | **Fixed** (Kira now at `/`) |
| `CommerceRail` built but unwired | P1 | **Fixed** |
| Cart not persisted across refresh | P1 | **Fixed** |
| E2E tests expect textarea on `/` | P1 | Should pass now |

---

## Unused components

- `app/components/ui/chat-input.tsx` — alternate input, unused
- `app/components/ui/credit-card-form.tsx` — not wired (external pay)
- `CommerceRail` — was unused; now wired

---

## P0/P1 reliability issues

### P0 (resolved this session)

1. Full-screen Kira restored at `/`
2. CommerceRail wired for gift brief chips

### P1 (remaining)

1. `GROQ_API_KEY` silent failure without env
2. Groq 429 → model cascade drops tools on 8B
3. Seed product ID resolution at checkout can fail
4. No route-level error boundaries

---

## Screenshots captured

Location: `/audit/kira-current/screenshots/`

| State | Files |
|-------|-------|
| Hero | `hero-375.png`, `hero-1280.png` |
| Active chat | `chat-active-375.png`, `chat-active-1280.png` |
| Product results | `product-results-375.png`, `product-results-1280.png` |
| Quick view | `quick-view-375.png`, `quick-view-1280.png` |
| Cart drawer | `cart-drawer-375.png`, `cart-drawer-1280.png` |
| Delivery | `delivery-estimator-375.png`, `delivery-estimator-1280.png` |
| Checkout | `checkout-375.png`, `checkout-1280.png` |
| Tracking | `tracking-375.png`, `tracking-1280.png` |
| Loading | `loading-375.png`, `loading-1280.png` |
| Error | `error-375.png`, `error-1280.png` |
| Sinhala | `sinhala-375.png`, `sinhala-1280.png` |
| Mobile dock | `mobile-dock-375.png`, `mobile-dock-1280.png` |
