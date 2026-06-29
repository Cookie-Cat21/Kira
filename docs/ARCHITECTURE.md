# Kira — Architecture & Decision Log

## Request flow

```
User message
    │
    ▼
POST /api/chat  (app/api/chat/route.ts)
    │
    ├─► tryHandleDeterministicPrompt()   ← runs first, short-circuits if matched
    │       │
    │       ├─► Empty input
    │       ├─► JAILBREAK_RE intercept   ← persona-change / ignore-instructions
    │       ├─► TRUST_RE intercept       ← "is Kapruka legit?" style questions
    │       ├─► Cart contents            ← reads client-side tray state
    │       ├─► "Tell me about"          ← storefront seed catalog (not in MCP)
    │       ├─► Tracking fast-path       ← "track order KP12345"
    │       ├─► Reorder by ref / session
    │       ├─► Cart delivery check
    │       ├─► Add-to-cart / list-as-text / re-show / more-options
    │       └─► Checkout fill-in state machine
    │
    └─► Groq agentic loop (up to 4 tool rounds)
            │
            ├─► Model cascade: llama-3.3-70b → llama-4-scout-17b → llama-3.1-8b
            └─► MCP tool calls → mcp.kapruka.com
```

SSE events streamed back: `step` · `token` · `products` · `delivery` · `tracking` · `checkout` · `payLink` · `done` · `error`

---

## Deterministic fast-paths

Fast-paths live in `tryHandleDeterministicPrompt()` in `lib/kira/fast-paths.ts`. They run **before** the LLM loop for stateful or safety-critical patterns only.

**Product search, vague queries, delivery policy, COD, out-of-scope, gift intent, rush/same-day, and category keyword routing were removed in PR #90** — Groq + `kira-prompt.ts` handle those now.

### What still fast-paths

| Pattern | Why not LLM-only |
|---|---|
| Empty input | No API call needed |
| Jailbreak / trust | Must run before model sees message |
| Cart contents | Client-side tray state |
| Tell me about (storefront) | Neon/seed products aren't in live MCP |
| Tracking / reorder | Reliable order-number extraction + MCP |
| Re-show / more / add-to-cart | Referential state on `lastProducts` / `shownProducts` |
| Checkout fill-in | Structured field collection state machine |

### Opening greeting coordination

The client renders a contextual opening bubble (`buildOpeningMessage()` in `KiraExperience.tsx`) with id `"opening"`. That message **is sent to `/api/chat`** so the LLM knows Kira already welcomed the user. It is still **excluded from localStorage** persistence so sessions don't duplicate the opener on reload.

Bare greetings (`hey`, `hi`) are **not** fast-pathed — the LLM responds in context without re-introducing.

### JAILBREAK_RE

```
/\b(pretend\s+(you'?re?|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+...instructions?|...)\b/i
```

Matches persona-change and jailbreak attempts. Returns Kira's in-character one-liner without calling any tools.

### TRUST_RE

```
/\b(is\s+(kapruka|this|it)\s+(legit|safe|real|trusted?|reliable|genuine|authentic|scam)|...)\b/i
```

Matches platform trust questions. Returns a warm brand affirmation without calling any tools.

---

## Prompt engineering rules (`lib/kira-prompt.ts`)

### Conversation vs. search intent

- Meta-words (`gift`, `present`, `something nice`) are not search queries — ask for a concrete product type first.
- **Concrete product type** (flowers, cake, chocolate, etc.) → search immediately, even without budget or city.
- **Vague message with no product type** → one clarifying question, no search.
- **Already greeted?** → don't re-introduce; continue the conversation naturally.

### Out-of-scope

Weather, flights, restaurants, creative content, general knowledge → warm one-liner redirect, no tools.

---

## MCP tool quirks

All documented in `CLAUDE.md`. Key ones:

| Quirk | Where handled |
|---|---|
| `response_format: "json"` injected into every tool call | `callMcpTool()` |
| Some tools wrap params under `{ params: ... }` | `resolveSchema()` / `needsParamsWrap()` |
| Model returns numbers as strings | `coerceArgTypes()` |
| Groq rejects strict enum schemas | `relaxSchema()` |
| Delivery results cached per `city\|date\|product` | inline cache in route handler |

---

## Groq model cascade

| Priority | Model | Used when |
|---|---|---|
| 1 | `llama-3.3-70b-versatile` | Primary — all requests |
| 2 | `meta-llama/llama-4-scout-17b-16e-instruct` | 429 on primary |
| 3 | `llama-3.1-8b-instant` | Last resort — **tool schemas dropped**, told not to invent products |

When the 8b fallback is active, deterministic fast-paths (tracking, re-show, checkout fill-in) still work because they call MCP directly. Product search quality depends on the model using tools — prefer the 70B/Scout cascade when possible.

---

## UI changes (2026-06-06)

### Navbar — Apple Liquid Glass redesign
- Replaced `.glass-nav` with `.liquid-glass-nav` in `globals.css`
- `backdrop-filter: blur(48px) saturate(220%) brightness(1.08)` — heavier blur than before
- Specular top highlight via `box-shadow: inset 0 1px 0 rgba(255,255,255,0.14)`
- Status indicators redesigned: pill badges → inline dots + text
- `McpStatusBadge` trigger: removed pill border, smaller dot (1.5px), SF Pro font
- Height fixed at 52px (was variable `h-14 lg:h-[4.5rem]`)
- Logo height: 44px (2.75rem)
