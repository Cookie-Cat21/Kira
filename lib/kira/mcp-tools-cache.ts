import type { listMcpTools } from "@/lib/mcp-client";

type CachedTools = {
  tools: Awaited<ReturnType<typeof listMcpTools>>;
  ts: number;
};

let mcpToolsCache: CachedTools | null = null;
const MCP_TOOLS_TTL_MS = 5 * 60 * 1000;

export function getCachedMcpTools():
  | Awaited<ReturnType<typeof listMcpTools>>
  | null {
  if (mcpToolsCache && Date.now() - mcpToolsCache.ts < MCP_TOOLS_TTL_MS) {
    return mcpToolsCache.tools;
  }
  return null;
}

export function setCachedMcpTools(
  tools: Awaited<ReturnType<typeof listMcpTools>>
): void {
  mcpToolsCache = { tools, ts: Date.now() };
}

export function clearMcpToolsCache(): void {
  mcpToolsCache = null;
}
