# ✦ Kira

Sri Lanka's first AI shopping companion — warm, witty, and built to help real people send the right thing to the right person, anywhere on the island.

Built for the **[Kapruka Agent Challenge 2026](https://www.kapruka.com/contactUs/agentChallenge.html)**.

---

## What it does

Kira takes you from "I have no idea what to get" all the way to a working checkout — in one conversation. She understands Sri Lankan occasions, speaks Tanglish naturally, and connects to Kapruka's live product catalog, delivery quotes, and guest checkout.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS v4** with custom design tokens
- **Claude API** (`claude-sonnet-4-20250514`) for the agent
- **Kapruka MCP** (`https://mcp.kapruka.com/mcp`) for live products, delivery & checkout
- **Vercel** for deployment

## Getting started

```bash
# Install dependencies
npm install

# Copy env file and add your Anthropic API key
cp .env.example .env.local

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 0 — MCP exploration

Before working on UI, verify the Kapruka MCP end-to-end:

```bash
node scripts/test-mcp.mjs
```

This lists all available tools, runs a product search, fetches categories, and checks a delivery quote to Kandy.

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com) |

---

*Built by Ovindu Karunaratne · June 2026*
