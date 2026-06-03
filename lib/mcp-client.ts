import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const KAPRUKA_MCP_URL = "https://mcp.kapruka.com/mcp";

export async function createMcpClient(): Promise<Client> {
  const client = new Client({ name: "kira", version: "1.0.0" });

  const transport = new StreamableHTTPClientTransport(
    new URL(KAPRUKA_MCP_URL)
  );

  await client.connect(transport);
  return client;
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
