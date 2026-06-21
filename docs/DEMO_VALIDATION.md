# Demo validation and founder-readiness runbook

This repo supports two checkout modes:

## Live checkout

Default behavior calls Kapruka MCP `kapruka_create_order` and expects a real
checkout URL from Kapruka.

```bash
npx next dev --port 3107
```

Use this only when you are intentionally testing real order creation.

## Sandbox checkout

Sandbox mode validates the same cart and delivery payload but returns a
Kapruka-shaped checkout response without creating a real order.

```bash
KIRA_CHECKOUT_MODE=sandbox npx next dev --port 3107
```

For non-production API tests, you can also send:

```http
x-kira-checkout-mode: sandbox
```

This is for demo safety and QA only. Production does not honor the header.

## Founder-readiness checks

Run these before a serious demo:

```bash
npm run lint
npm run build
node scripts/test-mcp.mjs
KIRA_API_URL=http://localhost:3107/api/chat node scripts/run-tests.mjs --id 46,48,63,64,65,66
KIRA_API_URL=http://localhost:3107/api/chat npm run test:language-smoke
KIRA_API_URL=http://localhost:3107/api/chat npm run test:load-smoke -- --requests 100 --concurrency 10
npx playwright test tests/e2e/kira.spec.ts --grep "commerce rail|quick-view|Order tracking|S1 fix|S2 fix"
```

## What the load smoke proves

`scripts/load-smoke.mjs` intentionally uses deterministic low-cost paths:

- `/api/health`
- trust fast-path
- package tracking prompt with no order number
- checkout validation

It does not prove Groq/MCP can sustain high-volume live product traffic. It
does prove the app shell, deterministic API paths, SSE parsing, and validation
remain stable under concurrent demo traffic.

## Language smoke

`scripts/language-smoke.mjs` validates deterministic Sinhala, Tamil, and
English mixed-script behavior. It is not a substitute for native-speaker copy
review, but it catches script-mode regressions before demos.

## Remaining production validation

To claim production-grade readiness, still run:

- controlled sandbox/payment-provider integration test,
- rate-limit tests against paid or reserved Groq/MCP capacity,
- native Sinhala/Tamil copy review,
- full persona suite with `--concurrency 1`.
