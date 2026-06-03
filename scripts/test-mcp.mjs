/**
 * Phase 0 MCP exploration script.
 * Run: node scripts/test-mcp.mjs
 *
 * Tests: list tools → search products → get delivery quote → (optionally) create order
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://mcp.kapruka.com/mcp";

async function main() {
  console.log("Connecting to Kapruka MCP...\n");

  const client = new Client(
    { name: "kira-test", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);

  console.log("Connected.\n");

  // 1. List tools
  console.log("=== Available Tools ===");
  const { tools } = await client.listTools();
  tools.forEach((t) => {
    console.log(`  ${t.name}: ${t.description ?? "(no description)"}`);
  });
  console.log();

  // 2. Search products
  console.log("=== Search: 'chocolate' ===");
  const searchResult = await client.callTool({
    name: "search_products",
    arguments: { query: "chocolate", limit: 4 },
  });
  console.log(JSON.stringify(searchResult.content, null, 2));
  console.log();

  // 3. Get categories
  console.log("=== Categories ===");
  const catResult = await client.callTool({
    name: "get_categories",
    arguments: {},
  });
  console.log(JSON.stringify(catResult.content, null, 2));
  console.log();

  // 4. Delivery quote to Kandy
  console.log("=== Delivery quote: Kandy ===");
  const deliveryResult = await client.callTool({
    name: "get_delivery_quote",
    arguments: { city: "Kandy" },
  });
  console.log(JSON.stringify(deliveryResult.content, null, 2));
  console.log();

  await client.close();
  console.log("Done. Check above for data shapes to refine TypeScript types.");
}

main().catch((err) => {
  console.error("MCP test failed:", err.message);
  process.exit(1);
});
