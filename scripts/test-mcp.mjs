/**
 * Phase 0 MCP exploration script — uses real Kapruka tool names.
 * Run: node scripts/test-mcp.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://mcp.kapruka.com/mcp";

async function call(client, tool, args) {
  const result = await client.callTool({ name: tool, arguments: args });
  return result.content;
}

async function main() {
  console.log("Connecting to Kapruka MCP...\n");
  const client = new Client({ name: "kira-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
  console.log("Connected.\n");

  // 1. List tools
  const { tools } = await client.listTools();
  console.log("=== Available Tools ===");
  tools.forEach((t) => console.log(`  ${t.name}`));
  console.log();

  // 2. Search products
  console.log("=== Search: birthday cake (JSON) ===");
  const search = await call(client, "kapruka_search_products", {
    q: "birthday cake",
    limit: 3,
    response_format: "json",
  });
  const searchData = JSON.parse(search[0].text);
  console.log("Total results:", searchData.results?.length);
  if (searchData.results?.[0]) {
    const p = searchData.results[0];
    console.log("First product:", {
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      url: p.url,
      in_stock: p.in_stock,
    });
  }
  console.log();

  // 3. Categories
  console.log("=== Top-level Categories ===");
  const cats = await call(client, "kapruka_list_categories", {
    depth: 1,
    response_format: "json",
  });
  const catData = JSON.parse(cats[0].text);
  catData.categories?.slice(0, 8).forEach((c) => console.log(`  ${c.name}`));
  console.log();

  // 4. Delivery check
  console.log("=== Delivery to Kandy ===");
  const delivery = await call(client, "kapruka_check_delivery", {
    city: "Kandy",
    response_format: "json",
  });
  const delivData = JSON.parse(delivery[0].text);
  console.log({
    city: delivData.city,
    available: delivData.available,
    rate: delivData.rate,
    currency: delivData.currency,
    checked_date: delivData.checked_date,
  });
  console.log();

  await client.close();
  console.log("✓ All tools confirmed working. Update extractProducts/extractPayLink with real field names.");
}

main().catch((err) => {
  console.error("MCP test failed:", err.message);
  process.exit(1);
});
