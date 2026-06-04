# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build (runs type-check)
npm run lint     # ESLint (no test suite exists)
```

There are no automated tests. Functional testing is done by running the dev server and exercising the chat UI. A manual MCP probe script exists at `scripts/test-mcp.mjs` — run with `node scripts/test-mcp.mjs` to verify the Kapruka MCP endpoint is reachable and returning expected shapes.

## Required environment variables

`GROQ_API_KEY` must be set in `.env.local`. Without it the chat API returns empty responses silently.

## Architecture

This is a single-page chat app. The entire UI lives in `app/page.tsx`. There is no routing beyond the one page and one API route.

**Data flow:**
1. User message → `POST /api/chat` (`app/api/chat/route.ts`)
2. Server opens an MCP connection to `https://mcp.kapruka.com/mcp`, runs an agentic Groq loop (up to 5 tool rounds), streams SSE events back
3. Client (`app/page.tsx`) consumes the SSE stream and updates React state in-place on the current message

**SSE event types** (emitted by route, consumed by page):
- `step` — tool in progress (shown in ThinkingLive)
- `token` — text word (builds the assistant message)
- `products` — `KiraProduct[]` for the carousel
- `delivery` — `DeliveryQuote` (fee, perishable flag, next-available date)
- `tracking` — `OrderTracking` (timeline)
- `checkout` — `CheckoutInfo` (summary totals)
- `payLink` — string URL
- `done` / `error`

**Groq model cascade** (free-tier, in priority order):
1. `llama-3.3-70b-versatile` — primary, 100k tokens/day limit
2. `meta-llama/llama-4-scout-17b-16e-instruct` — first fallback on 429
3. `llama-3.1-8b-instant` — last resort; tool schemas are **dropped** and it is told not to invent products

**Deterministic fast-path** (`tryHandleDeterministicPrompt` in `route.ts`): certain message patterns (tracking requests, "ready to checkout", simple category searches like "show me cakes on Kapruka") bypass the LLM loop entirely and call MCP tools directly. This saves tokens and is more reliable for these predictable flows.

**MCP tool handling quirks:**
- All 7 tools have `response_format: "json"` injected before calling
- Some MCP tool schemas wrap params under `{ params: ... }` — `resolveSchema` / `needsParamsWrap` handles this transparently
- `coerceArgTypes` converts string values to the types the schema expects (the model often returns numbers as strings)
- `relaxSchema` strips `enum` constraints and widens numeric/boolean fields to `anyOf` with string — this prevents Groq 400 errors from strict schema validation
- Delivery results are cached per `city|date|product` key within a single request

**Key files:**
- `lib/kira-prompt.ts` — system prompt + `getContextualGreeting()` / `getUpcomingOccasion()`. All LLM behaviour is controlled here.
- `lib/mcp-parsing.ts` — all MCP response extraction logic. `extractDeliveryInfoFromMcp` handles the fee/perishable/next-available-date shape; `extractProductsFromMcp` caps at 6.
- `lib/mcp-client.ts` — MCP connection with 3-attempt retry
- `types/index.ts` — all shared interfaces (`KiraProduct`, `KiraMessage`, `DeliveryQuote`, `CheckoutInfo`, `OrderTracking`, etc.)
- `app/components/ProductCard.tsx` — card with image, price, delivery badge, Add to Cart
- `app/components/ProductQuickView.tsx` — full-screen modal triggered by tapping a card; calls `GET /api/products/[id]` which calls `kapruka_get_product`
- `app/components/OrderTracker.tsx` — framer-motion status timeline
- `app/components/ThinkingBlock.tsx` — `ThinkingLive` (in-progress steps) and `ThinkingDone` (collapsed step summary)

## Design system

Tailwind v4 with `@theme` tokens defined in `app/globals.css`. Key tokens:
- `kap-purple` `#402970`, `kap-yellow` `#f8da08` — Kapruka brand colours
- `kira-bg` `#f7f5fc`, `kira-border` `#e8e2f5`, `kira-text` `#1a0f33`
- Fonts: `font-display` (DM Serif) for headings, `font-sans` (Jakarta) for body
- Animations: `fade-up`, `pop-in`, `blink` — defined in globals.css

## Prompt engineering rules

The system prompt in `lib/kira-prompt.ts` is the sole source of Kira's behaviour. When adding new flows:
- Keep total prompt length lean — every request resends the full prompt + all 7 tool schemas across up to 5 rounds (significant token cost on the 70B model)
- New behaviour goes in a clearly labelled section with a few-shot example
- Sinhala replies are gated strictly on Unicode Sinhala script in the user's message — English topic words about Sri Lankan things do NOT trigger Sinhala mode
- `new Date()` in the prompt is evaluated at module load time, not per-request — the date injected into the checkout rules section will be stale after a cold start; this is acceptable for the challenge timeframe

## Kapruka MCP limits

60 req/min/IP · 30 orders/hr/IP · 30-min server-side cache on read tools. Do not add polling or retry loops against MCP tools.
