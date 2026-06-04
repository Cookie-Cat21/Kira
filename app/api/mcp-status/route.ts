import { createMcpClient, listMcpTools } from "@/lib/mcp-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type McpStatus = "up" | "degraded" | "down";

export interface McpStatusResponse {
  status: McpStatus;
  latencyMs: number | null;
  checkedAt: string;
  error?: string;
}

const DEGRADED_THRESHOLD_MS = 4_000;

export async function GET() {
  const start = Date.now();
  try {
    const client = await createMcpClient();
    await listMcpTools(client);
    const latencyMs = Date.now() - start;
    const status: McpStatus = latencyMs >= DEGRADED_THRESHOLD_MS ? "degraded" : "up";
    return Response.json({
      status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    } satisfies McpStatusResponse);
  } catch (err) {
    return Response.json({
      status: "down",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Unknown error",
    } satisfies McpStatusResponse, { status: 200 });
  }
}
