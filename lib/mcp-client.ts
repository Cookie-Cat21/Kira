import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const KAPRUKA_MCP_URL = "https://mcp.kapruka.com/mcp";

export async function createMcpClient(): Promise<Client> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = new Client({ name: "kira", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(KAPRUKA_MCP_URL));
    try {
      await client.connect(transport);
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
  const result = await client.callTool({ name, arguments: args });
  return result;
}
