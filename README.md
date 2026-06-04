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
