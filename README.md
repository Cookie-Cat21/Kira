# ✦ Kira

Sri Lanka's first AI shopping companion — warm, witty, and built to help real people send the right thing to the right person, anywhere on the island.

Built for the **[Kapruka Agent Challenge 2026](https://www.kapruka.com/contactUs/agentChallenge.html)**.

---

## What it does

Kira takes you from "I have no idea what to get" all the way to a working checkout — in one conversation. She understands Sri Lankan occasions, speaks Tanglish naturally, and connects to Kapruka's live product catalog, delivery quotes, and guest checkout.

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4** with custom design tokens
- **Groq API** (`llama-3.3-70b-versatile` with free-tier fallbacks) for the agent
- **Kapruka MCP** (`https://mcp.kapruka.com/mcp`) for live products, delivery & checkout
- **Vercel** for deployment

## Getting started

```bash
# Install dependencies
npm install

# Copy env file and add your Groq API key
cp .env.example .env.local

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## One-tap reorder (Phase 1) — shipped

Returning customers can reorder in **≤2 taps** without retyping delivery details:

- **"Order this again"** on post-checkout success (modal + chat card)
- **Welcome back** strip when `lastOrder` exists in localStorage
- Chat `"order again"` opens prefilled checkout when full delivery snapshot exists
- **Track → Reorder** lands in checkout review, not cart-only

Full plan: [`docs/REORDER-PLAN.md`](docs/REORDER-PLAN.md)

### Phase 2 roadmap (deferred — not required for challenge v1)

| Feature | Why deferred |
|---------|----------------|
| Kapruka account login + order history | Needs auth API beyond MCP |
| Cross-device sync (Supabase) | v1 uses `localStorage` habit loop |
| Scheduled reorder / occasion reminders | Retention product, not demo scope |
| "Reorder similar" when SKU discontinued | Needs search fallback logic |

## Testing & CEO review

See [`docs/TESTING.md`](docs/TESTING.md) for the full runbook. Quick gates:

```bash
npm run build
npm run test:live-regression          # production traps (incl. LIVE-X001–X002)
node scripts/test-personas.mjs --group x --concurrency 1
npm run test:dulith-qa:smoke
npm run test:e2e:reorder                # Playwright UI reorder path
```

**Voice input:** Kira does not ship voice-to-text today (visual orb only). Automated CEO review covers API personas, live traps, Playwright UI, and `ceo-lens` heuristics — not microphone input. See TESTING.md § Voice & multimodal.

**Submission gate:** `npm run test:dulith-gate` — all founder phases in one command. Demo script: [`docs/JUDGE-DRY-RUN.md`](docs/JUDGE-DRY-RUN.md).

**Autonomous mode (no human approval):** [`docs/DULITH-AUTONOMOUS-PLAN.md`](docs/DULITH-AUTONOMOUS-PLAN.md) — Dulith plans auto-approve at ≥9/10; agents loop fix → deploy → gate until green. One command: `npm run test:dulith-autonomous`.

## Phase 0 — MCP exploration

Before working on UI, verify the Kapruka MCP end-to-end:

```bash
node scripts/test-mcp.mjs
```

This lists all available tools, runs a product search, fetches categories, and checks a delivery quote to Kandy.

## Environment variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key — get one at [console.groq.com](https://console.groq.com) |

---

*Built by Ovindu Karunaratne · June 2026*
