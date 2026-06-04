/**
 * Phase 0 MCP exploration script — uses real Kapruka tool names.
 * Run: node scripts/test-mcp.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://mcp.kapruka.com/mcp";

async function call(client, tool, params) {
  const result = await client.callTool({ name: tool, arguments: { params } });
  return readMcpPayload(tool, result.content);
}

function readMcpPayload(tool, content) {
  const text =
    content?.find?.((block) => block.type === "text")?.text ??
    content?.[0]?.text ??
    "";

  if (!text.trim()) {
    return { ok: false, text: "", data: null, error: `${tool}: empty response` };
  }

  try {
    return { ok: true, text, data: JSON.parse(text), error: null };
  } catch {
    const isExpectedText =
      text.startsWith("No products found") || text.startsWith("Error:");
    return {
      ok: false,
      text,
      data: null,
      error: isExpectedText ? text : `${tool}: non-JSON response: ${text}`,
    };
  }
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
  console.log("=== Search: roses (JSON success) ===");
  const search = await call(client, "kapruka_search_products", {
    q: "roses",
    limit: 3,
    in_stock_only: true,
    response_format: "json",
  });
  if (!search.ok) throw new Error(search.error);
  const searchData = search.data;
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

  console.log("=== Search: no products response ===");
  const noProducts = await call(client, "kapruka_search_products", {
    q: "birthday cake",
    limit: 3,
    in_stock_only: true,
    response_format: "json",
  });
  console.log(noProducts.ok ? "Unexpected products found" : noProducts.error);
  console.log();

  // 3. Categories
  console.log("=== Top-level Categories ===");
  const cats = await call(client, "kapruka_list_categories", {
    depth: 1,
    response_format: "json",
  });
  if (!cats.ok) throw new Error(cats.error);
  const catData = cats.data;
  catData.categories?.slice(0, 8).forEach((c) => console.log(`  ${c.name}`));
  console.log();

  // 4. City resolution
  console.log("=== Delivery city alias: kandy ===");
  const cities = await call(client, "kapruka_list_delivery_cities", {
    query: "kandy",
    limit: 3,
    response_format: "json",
  });
  if (!cities.ok) throw new Error(cities.error);
  console.log(cities.data.cities?.[0]);
  console.log();

  // 5. Delivery check
  console.log("=== Delivery to Kandy ===");
  const delivery = await call(client, "kapruka_check_delivery", {
    city: "Kandy",
    response_format: "json",
  });
  if (!delivery.ok) throw new Error(delivery.error);
  const delivData = delivery.data;
  console.log({
    city: delivData.city,
    available: delivData.available,
    rate: delivData.rate,
    currency: delivData.currency,
    checked_date: delivData.checked_date,
    next_available_date: delivData.next_available_date,
    reason: delivData.reason,
  });
  console.log();

  // 6. Perishable warning probe
  console.log("=== Perishable delivery warning ===");
  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const perishable = await call(client, "kapruka_check_delivery", {
    city: "Kandy",
    delivery_date: futureDate,
    product_id: "FLOWERS00T2075",
    response_format: "json",
  });
  if (!perishable.ok) throw new Error(perishable.error);
  console.log({
    checked_date: perishable.data.checked_date,
    rate: perishable.data.rate,
    perishable_warning: perishable.data.perishable_warning,
  });
  console.log();

  await client.close();
  console.log("✓ MCP probe completed with JSON and text-response handling.");
}

main().catch((err) => {
  console.error("MCP test failed:", err.message);
  process.exit(1);
});
