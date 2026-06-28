const DEFAULT_API_URL = "http://localhost:3107/api/chat";

const apiUrl = process.env.KIRA_API_URL ?? DEFAULT_API_URL;
const origin = new URL(apiUrl).origin;
const totalRequests = Number(arg("--requests") ?? 100);
const concurrency = Number(arg("--concurrency") ?? 10);

const scenarios = [
  {
    name: "health",
    run: async () => {
      const res = await fetch(`${origin}/api/health`);
      if (!res.ok) throw new Error(`health ${res.status}`);
      const body = await res.json();
      if (body?.app !== "kira") throw new Error("wrong app marker");
    },
  },
  {
    name: "trust-fast-path",
    run: async () => {
      const text = await postChat("Is Kapruka legit?");
      if (!/kapruka|legit|safe|trusted/i.test(text)) {
        throw new Error(`unexpected trust response: ${text.slice(0, 120)}`);
      }
    },
  },
  {
    name: "tracking-no-ref-fast-path",
    run: async () => {
      const text = await postChat("track my package");
      if (!/order number|confirmation email/i.test(text)) {
        throw new Error(`unexpected tracking response: ${text.slice(0, 120)}`);
      }
    },
  },
  {
    name: "checkout-validation",
    run: async () => {
      const res = await fetch(`${origin}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: [], delivery: {} }),
      });
      if (res.status !== 400) throw new Error(`checkout status ${res.status}`);
    },
  },
];

const started = Date.now();
const results = [];
let cursor = 0;

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < totalRequests) {
      const index = cursor++;
      const scenario = scenarios[index % scenarios.length];
      const t0 = Date.now();
      try {
        await scenario.run();
        results.push({ scenario: scenario.name, ok: true, ms: Date.now() - t0 });
      } catch (err) {
        results.push({
          scenario: scenario.name,
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  })
);

const failed = results.filter((r) => !r.ok);
const sorted = [...results].sort((a, b) => a.ms - b.ms);
const p95 = sorted[Math.floor(sorted.length * 0.95)]?.ms ?? 0;
const elapsed = Date.now() - started;

console.log("Load smoke summary");
console.log("------------------");
console.log(`Target:      ${origin}`);
console.log(`Requests:    ${results.length}`);
console.log(`Concurrency: ${concurrency}`);
console.log(`Elapsed:     ${elapsed}ms`);
console.log(`p95:         ${p95}ms`);
console.log(`Failed:      ${failed.length}`);

if (failed.length > 0) {
  for (const item of failed.slice(0, 10)) {
    console.log(`- ${item.scenario}: ${item.error}`);
  }
  process.exit(1);
}

async function postChat(message) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      cart: [],
      language: "en",
    }),
  });
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame
        .split(/\r?\n/)
        .find((candidate) => candidate.startsWith("data:"));
      if (!line) continue;
      const payload = JSON.parse(line.slice(5).trim());
      if (payload.t === "token") text += String(payload.v ?? "");
      if (payload.t === "error") throw new Error(String(payload.v ?? "stream error"));
      if (payload.t === "done") return text;
    }
  }
  return text;
}

function arg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
