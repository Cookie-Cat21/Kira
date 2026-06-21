import { callMcpTool, type getMcpClient } from "@/lib/mcp-client";
import { extractProductsFromMcp } from "@/lib/mcp-parsing";
import type { CartItem } from "@/types";

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function looksLikeMcpProductId(id: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(id);
}

export async function resolveMcpProductId(
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>,
  item: CartItem,
  cache: Map<string, string>
): Promise<string> {
  const rawId = String(item.product.id ?? "").trim();
  if (!rawId) return "";
  if (looksLikeMcpProductId(rawId)) return rawId;

  const name = String(item.product.name ?? "").trim();
  if (!name) return rawId;
  const cacheKey = normalizeName(name);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: name,
        limit: 6,
        in_stock_only: true,
        response_format: "json",
      },
    });
    const candidates = extractProductsFromMcp(searchResult.content);
    if (candidates.length === 0) return rawId;

    const exact = candidates.find(
      (candidate) => normalizeName(candidate.name) === cacheKey
    );
    const resolved = String((exact ?? candidates[0]).id ?? "").trim();
    if (resolved) cache.set(cacheKey, resolved);
    return resolved || rawId;
  } catch {
    return rawId;
  }
}
