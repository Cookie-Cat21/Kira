# Plan 004: Two small hardening fixes — guard `/api/chat` against malformed bodies, and keep the `/liquid-glass` demo out of search indexing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. These are two independent tasks (A and B) in one plan; you may
> commit them separately. If anything in "STOP conditions" occurs, stop and
> report. When done, update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7945c29..HEAD -- app/api/chat/route.ts app/liquid-glass/page.tsx`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (Task A) / tech-debt (Task B)
- **Planned at**: commit `7945c29`, 2026-06-11

## Why this matters

**Task A** — `POST /api/chat` parses the request body with `await req.json()`
*outside* its try/catch. A malformed or non-JSON body therefore throws an
unhandled exception and Next returns a bare 500 with no useful message — and,
because it happens before the SSE stream is set up, the client's stream parser
sees a hard failure rather than a graceful error event. The sibling
`app/api/checkout/route.ts` already guards `req.json()` correctly; this just
brings chat to parity. **Task B** — the `/liquid-glass` component-kit demo page
is compiled into the production bundle as a public, prerendered route. On the
live judged URL it's an undocumented public page that can be crawled/indexed.
Adding `noindex` keeps it reachable (useful as a living component gallery)
without it becoming an indexed, "official-looking" surface. Both are small,
isolated, low-risk.

## Current state

**Task A** — `app/api/chat/route.ts`, top of the handler (line ~396–399):
```ts
export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();   // ← unguarded, outside try/catch

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { messages, cart, deliveryCity, ... } = body;
        // ...
```
Compare with the *correct* pattern already in `app/api/checkout/route.ts`:
```ts
export async function POST(req: NextRequest) {
  try {
    const body: CheckoutRequest = await req.json();
    // ... validation, returns NextResponse.json({error}, {status:400}) on bad input
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

**Task B** — `app/liquid-glass/page.tsx` is a client component
(`"use client"`) with no `metadata` export. (A `"use client"` file cannot export
`metadata`; the fix uses a route-segment `robots` signal that works for client
pages — see Step B.) Build output confirms it ships as a static route
(`○ /liquid-glass`).

**Conventions**: API routes return `NextResponse.json({ error }, { status })`
for client errors. TypeScript, 2-space indent. Commit prefixes `fix:` /
`chore:`.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`            | exit 0              |
| Build     | `npm run build`               | exit 0              |
| Dev       | `npm run dev`                 | server on :3000     |

## Scope

**In scope**:
- `app/api/chat/route.ts` — Task A only (the `req.json()` guard at the top)
- `app/liquid-glass/layout.tsx` (create) — Task B
- `app/components/glass/*`, `app/liquid-glass/page.tsx` — **read-only**; do not
  modify the demo or the kit.

**Out of scope** (do NOT touch):
- Any other logic in `app/api/chat/route.ts` — only add the body-parse guard;
  the agentic loop, fast-paths, and SSE logic are off-limits (plan 005 owns
  refactoring that file).
- Deleting the demo or the kit — Task B keeps the route, only de-indexes it.

## Git workflow

- Branch: `advisor/004-hardening`
- Two commits acceptable: `fix: guard /api/chat against malformed JSON body`
  and `chore: noindex the /liquid-glass demo route`.
- Do NOT push or open a PR unless instructed.

## Steps

### Task A — Step A1: Guard the body parse in `/api/chat`

Wrap the parse so a malformed body returns a clean 400 instead of an unhandled
500. Replace:
```ts
const body: ChatRequest = await req.json();
```
with:
```ts
let body: ChatRequest;
try {
  body = (await req.json()) as ChatRequest;
} catch {
  return new Response(
    JSON.stringify({ error: "Invalid request body" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```
Leave everything below unchanged. (A plain `Response` is used, not
`NextResponse`, to match the file's existing `new Response(stream, ...)` style
and avoid adding an import — either is acceptable.)

**Verify**:
- `npx tsc --noEmit` → exit 0.
- `npm run dev`, then:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" -d 'not json'
  ```
  → prints `400` (was a 500 before the fix).
- A well-formed body still streams normally:
  ```bash
  curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" \
    -d '{"messages":[],"cart":[]}' | head -c 50
  ```
  → returns SSE `data:` lines, not an error.

### Task B — Step B1: Add a `noindex` layout for the demo route

Because `app/liquid-glass/page.tsx` is a client component, add a route-segment
layout (a server component) that exports `metadata` with `robots: noindex`:
```tsx
// app/liquid-glass/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liquid Glass — UI kit",
  robots: { index: false, follow: false },
};

export default function LiquidGlassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

**Verify**:
- `npm run build` → exit 0, route still listed.
- `npm run dev`, then `curl -s http://localhost:3000/liquid-glass | grep -i robots`
  → shows a `<meta name="robots" content="noindex...">` tag.

## Test plan

- No unit tests (these are an HTTP-status fix and a metadata addition).
- Verification is the `curl` checks in Steps A1 and B1.
- Optional (if plan 001 landed): a tiny test asserting the chat route returns
  400 on invalid JSON is nice-to-have but requires booting the route — skip
  unless trivial in the harness.

## Done criteria

ALL must hold:

- [ ] `POST /api/chat` with a non-JSON body returns **400** (not 500); a valid
      body still streams SSE
- [ ] `app/liquid-glass/layout.tsx` exists and the served page includes a
      `robots noindex` meta tag
- [ ] `npx tsc --noEmit` exits 0 and `npm run build` exits 0
- [ ] Only in-scope files changed; no other logic in `route.ts` touched —
      `git diff app/api/chat/route.ts` shows ONLY the body-parse guard
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report if:

- The top of `app/api/chat/route.ts` no longer matches the "Current state"
  excerpt (e.g. plan 005 already refactored it) — re-locate the body parse
  before editing.
- Adding the guard changes the streaming behavior for valid bodies (it must
  not) — report.
- The operator indicates they want `/liquid-glass` fully removed from
  production rather than just de-indexed — that's a different change (see
  Maintenance notes); stop and confirm.

## Maintenance notes

- **Optional stronger gate for Task B**: to make `/liquid-glass` unreachable in
  production entirely (not just unindexed), add to `page.tsx`:
  `import { notFound } from "next/navigation"` and, at the top of the component,
  `if (process.env.NODE_ENV === "production" && !process.env.ENABLE_GLASS_DEMO) notFound();`
  Deferred here because the demo is a useful living gallery and the kit itself
  ships regardless.
- A reviewer should confirm the `route.ts` diff is *only* the body guard —
  this plan must not become a vehicle for unrelated chat-route edits.
