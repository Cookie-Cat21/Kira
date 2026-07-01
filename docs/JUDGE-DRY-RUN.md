# Judge dry-run — 60-second Kapruka demo script

Use this before submission. Dulith gate: **all automated checks green** + **one clean screen recording** of Path A.

## Automated preflight (5 min)

```bash
npm run build
node scripts/dulith-final-gate.mjs          # all Dulith gates on production
npm run test:live-regression                # 12 production traps
node scripts/judge-dry-run.mjs              # 10-step API judge path (needs dev on :3107)
npm run test:e2e:reorder                    # UI welcome-back + checkout prefill
```

Full script: [`docs/JUDGE-DRY-RUN.md`](docs/JUDGE-DRY-RUN.md)

Production URL: **https://kira-peach.vercel.app**

---

## Path A — One-tap reorder (CEO priority, ~60s)

Record this flow end-to-end:

1. Open **/** — chat loads (immersive surface).
2. Say: *"Show me gift hampers"* → tap a card → **Add to tray**.
3. Open tray → **Proceed to checkout** → fill delivery (Colombo, tomorrow, Amma, phone, address).
4. **Create Kapruka link** → success screen → tap **Order this again**.
5. Confirm checkout opens at **Review** with cart + prefilled delivery → pay link visible.
6. **Reload tab** → **Welcome back — reorder …?** strip appears → one tap → checkout review again.

**Pass:** ≤2 taps from success card to pay link; no retyping address on reorder.

---

## Path B — Search reliability (~30s)

1. *"show me chocolates and flowers"* → carousel has **no ribbon/sculpture cakes**.
2. *"show me flowers"* then *"show me chocolates"* → second carousel is chocolates only (no context bleed).

---

## Path C — Repair tone (~20s)

1. *"wife mad send roses Colombo don't tell me to hand deliver"* → Kapruka delivery + product carousel; **no** "pick up yourself" advice.

---

## Path D — Chat reorder fallback (~15s)

1. After Path A, type *"order again"* in chat → checkout opens (not carousel-only) when full `lastOrder` exists.

---

## What to say to judges (15s pitch)

> "Kira is Kapruka's AI shopping companion — live catalog, delivery quotes, guest checkout. Repeat buyers reorder in two taps without retyping Amma's address. Everything you see is wired to Kapruka MCP, not invented products."

---

## Voice (Phase 2 — not in this demo)

Voice input is a **late idea** — not shipped. Do not demo microphone; lean on text + one-tap reorder.

---

## If something fails live

| Symptom | Fix |
|---------|-----|
| Empty chat / "slammed" message | Groq quota — wait 1 min, retry |
| No products on combo search | Re-run `npm run test:live-regression` after deploy |
| Reorder shows carousel only | Clear localStorage; complete checkout once for full snapshot |
| 429 Too many requests | Rate limit hit — wait `Retry-After` seconds |
