import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const KAPRUKA_MCP_URL = "https://mcp.kapruka.com/mcp";
const CONNECT_TIMEOUT_MS = 8_000;
const TOOL_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`MCP ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("connection") ||
    msg.includes("not connected") ||
    msg.includes("transport") ||
    msg.includes("closed") ||
    msg.includes("econnreset") ||
    msg.includes("socket")
  );
}

// ── Singleton MCP client ──────────────────────────────────────────────────────
// Kept alive across requests — avoids the 200-500ms connect overhead per POST.
// Invalidated on connection errors so the next call reconnects automatically.
let _client: Client | null = null;
let _connecting: Promise<Client> | null = null;

async function connectFresh(): Promise<Client> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = new Client({ name: "kira", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(KAPRUKA_MCP_URL));
    try {
      await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, "connect");
      return client;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function getMcpClient(): Promise<Client> {
  if (_client) return _client;
  if (_connecting) return _connecting;
  _connecting = connectFresh()
    .then((c) => { _client = c; _connecting = null; return c; })
    .catch((err) => { _connecting = null; throw err; });
  return _connecting;
}

export function invalidateMcpClient(): void {
  _client = null;
  _connecting = null;
}

// Kept for backward-compat with scripts/test-mcp.mjs
export async function createMcpClient(): Promise<Client> {
  return getMcpClient();
}

export async function listMcpTools(client?: Client) {
  const c = client ?? (await getMcpClient());
  const result = await c.listTools();
  return result.tools;
}

export async function callMcpTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
) {
  try {
    return await withTimeout(
      client.callTool({ name, arguments: args }),
      TOOL_TIMEOUT_MS,
      `tool ${name}`
    );
  } catch (err) {
    if (isConnectionError(err)) invalidateMcpClient();
    throw err;
  }
}
