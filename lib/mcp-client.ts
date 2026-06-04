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

export async function createMcpClient(): Promise<Client> {
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

export async function listMcpTools(client: Client) {
  const result = await client.listTools();
  return result.tools;
}

export async function callMcpTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
) {
  return withTimeout(
    client.callTool({ name, arguments: args }),
    TOOL_TIMEOUT_MS,
    `tool ${name}`
  );
}
