# Kira — 90-second judge demo script

Run the app with `GROQ_API_KEY` set in `.env.local`, then follow this path.

## Path A — Diaspora sender (recommended)

1. Open **`/shop`**
2. In Gift Finder, set: **Birthday · Mom · Kandy · Rs. 10,000**
3. Tap **Ask Kira** → lands on full-screen `/` with CommerceRail chips pre-filled
4. Watch **You → Kira → Kapruka MCP** beam while tools run
5. Add a product to tray → **Review checkout** → pay link

**Exact seeded prompt:**
> I need a birthday gift for my mom in Kandy under Rs. 10,000. Help me find something they'll love on Kapruka.

## Path B — Sinhala

1. Open **`/`**
2. Tap **සිංහලෙන් අම්මාට තෑග්ගක්** (or switch **සිං** language first)
3. Kira replies in Sinhala when the message contains Sinhala script

## Path C — Seasonal (when active)

1. Open **`/`**
2. Tap the occasion pill at top (e.g. Vesak / Avurudu / Mother's Day)
3. One tap sends a pre-built seasonal prompt

## Fallback prompts

| Intent | Say this |
|--------|----------|
| Popular | What are the most popular gifts right now? |
| Track | Track order KP12345 |
| Same-day | Show me gifts with same-day delivery in Colombo |

## What to point out

- Full-screen chat at `/` — not a corner widget
- Live MCP tool trail (animated beam + step list)
- Shared cart between `/shop` and chat
- Real Kapruka catalog via `mcp.kapruka.com`
