const API_URL = process.env.KIRA_API_URL ?? "http://localhost:3107/api/chat";

const CASES = [
  {
    name: "Sinhala mode deterministic greeting",
    request: {
      messages: [{ role: "user", content: "hello" }],
      cart: [],
      language: "si",
    },
    mustMatch: /[\u0D80-\u0DFF]/,
    mustNotMatch: /[\u0B80-\u0BFF]/,
  },
  {
    name: "Tamil mode deterministic greeting",
    request: {
      messages: [{ role: "user", content: "hello" }],
      cart: [],
      language: "ta",
    },
    mustMatch: /[\u0B80-\u0BFF]/,
    mustNotMatch: /[\u0D80-\u0DFF]/,
  },
  {
    name: "English mode mixed-script delivery ask remains English",
    request: {
      messages: [{ role: "user", content: "ගාල්ල යවන්නකෝ" }],
      cart: [],
      language: "en",
    },
    mustMatch: /product|kapruka|deliver|delivery/i,
    mustNotMatch: /[\u0D80-\u0DFF\u0B80-\u0BFF]/,
  },
];

let failed = 0;

for (const testCase of CASES) {
  const text = await postChat(testCase.request);
  const pass =
    testCase.mustMatch.test(text) && !testCase.mustNotMatch.test(text);
  console.log(`${pass ? "✓" : "✗"} ${testCase.name}`);
  if (!pass) {
    failed++;
    console.log(`  Response: ${text}`);
  }
}

if (failed > 0) process.exit(1);

async function postChat(body) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
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
