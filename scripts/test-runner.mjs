const DEFAULT_API_URL = "http://localhost:3000/api/chat";
const DEFAULT_TIMEOUT_MS = 45_000;

export const API_URL = process.env.KIRA_API_URL ?? DEFAULT_API_URL;

export async function assertDevServerAvailable(apiUrl = API_URL) {
  const url = new URL(apiUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const health = await fetch(new URL("/api/health", url.origin), {
      signal: controller.signal,
    });
    if (!health.ok) {
      throw new Error(`health returned HTTP ${health.status}`);
    }
    const body = await health.json();
    if (body?.app !== "kira") {
      throw new Error(
        `expected Kira health app marker, got ${JSON.stringify(body)}`
      );
    }

    const probe = await sendTestCase({
      request: { messages: [{ role: "user", content: "" }], cart: [], language: "en" },
      checks: [],
    });
    const hasSseDone = probe.events.some((event) => event.t === "done");
    if (probe.error || !hasSseDone) {
      throw new Error(
        `chat SSE probe failed${probe.error ? `: ${probe.error}` : ""}`
      );
    }
  } catch {
    throw new Error(
      `Kira dev server is not available at ${url.origin}. ` +
        `Start this repo or set KIRA_API_URL to the correct /api/chat endpoint.`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTestCase(testCase) {
  if (testCase.endpoint === "checkout") {
    return sendJsonEndpoint(testCase);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();
  const events = [];
  let responseText = "";
  let sawDone = false;
  let streamError = "";

  const requestBody = normalizeRequest(testCase.request);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await safeReadText(res);
      return finish({
        events,
        responseText,
        startedAt,
        error: `HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ""}`,
      });
    }

    if (!res.body) {
      return finish({
        events,
        responseText,
        startedAt,
        error: "No response body received from SSE endpoint",
      });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = takeCompleteFrames(buffer);
      buffer = frames.remainder;

      for (const frame of frames.complete) {
        for (const event of parseFrame(frame)) {
          events.push(event);
          if (event.t === "token") responseText += String(event.v ?? "");
          if (event.t === "error") streamError = String(event.v ?? "Unknown error");
          if (event.t === "done") {
            sawDone = true;
            try {
              await reader.cancel();
            } catch {
              // The stream may already be closed.
            }
            break;
          }
        }
        if (sawDone) break;
      }
      if (sawDone) break;
    }

    if (!sawDone && buffer.trim()) {
      for (const event of parseFrame(buffer)) {
        events.push(event);
        if (event.t === "token") responseText += String(event.v ?? "");
        if (event.t === "error") streamError = String(event.v ?? "Unknown error");
        if (event.t === "done") sawDone = true;
      }
    }

    if (streamError) {
      return finish({ events, responseText, startedAt, error: streamError });
    }

    if (!sawDone) {
      return finish({
        events,
        responseText,
        startedAt,
        error: "Stream ended before done event",
      });
    }

    return finish({ events, responseText, startedAt });
  } catch (err) {
    const message =
      err?.name === "AbortError"
        ? "Timeout"
        : "Connection refused — is the dev server running?";
    return finish({ events, responseText, startedAt, error: message });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendJsonEndpoint(testCase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();
  const url = new URL(API_URL);
  url.pathname = `/api/${testCase.endpoint}`;
  url.search = "";

  try {
    const res = await fetch(url, {
      method: testCase.method ?? "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCase.request ?? {}),
      signal: controller.signal,
    });
    const responseText = await safeReadText(res);
    return finish({
      events: [],
      responseText,
      startedAt,
      status: res.status,
    });
  } catch (err) {
    const message =
      err?.name === "AbortError"
        ? "Timeout"
        : `Connection refused — is ${url.pathname} available?`;
    return finish({ events: [], responseText: "", startedAt, error: message });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRequest(request = {}) {
  return {
    messages: request.messages ?? [],
    cart: request.cart ?? [],
    language: request.language ?? "en",
    ...(request.deliveryCity ? { deliveryCity: request.deliveryCity } : {}),
    ...(request.deliveryDate ? { deliveryDate: request.deliveryDate } : {}),
    ...(request.lastProducts ? { lastProducts: request.lastProducts } : {}),
    ...(request.lastOrderCart ? { lastOrderCart: request.lastOrderCart } : {}),
    ...(request.internationalSender
      ? { internationalSender: request.internationalSender }
      : {}),
  };
}

function finish({ events, responseText, startedAt, error, status }) {
  return {
    events,
    responseText,
    durationMs: Date.now() - startedAt,
    ...(status ? { status } : {}),
    ...(error ? { error } : {}),
  };
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function takeCompleteFrames(buffer) {
  const complete = [];
  let rest = buffer;

  while (true) {
    const lf = rest.indexOf("\n\n");
    const crlf = rest.indexOf("\r\n\r\n");
    const candidates = [lf, crlf].filter((idx) => idx >= 0);
    if (candidates.length === 0) break;

    const idx = Math.min(...candidates);
    const delimiterLength = rest.startsWith("\r\n\r\n", idx) ? 4 : 2;
    complete.push(rest.slice(0, idx));
    rest = rest.slice(idx + delimiterLength);
  }

  return { complete, remainder: rest };
}

function parseFrame(frame) {
  const events = [];

  for (const rawLine of frame.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.startsWith("data:")) continue;

    const json = line.slice(5).trim();
    if (!json) continue;

    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.t === "string") {
        events.push(parsed);
      }
    } catch {
      events.push({ t: "error", v: `Malformed SSE data: ${json.slice(0, 200)}` });
    }
  }

  return events;
}
