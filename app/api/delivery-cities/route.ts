import { NextRequest } from "next/server";
import { createMcpClient, callMcpTool } from "@/lib/mcp-client";
import { parseMcpPayload } from "@/lib/mcp-parsing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type City = { name: string; aliases?: string[] };

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 12);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(25, limitParam))
    : 12;

  let client: Awaited<ReturnType<typeof createMcpClient>> | undefined;
  try {
    client = await createMcpClient();
    const result = await callMcpTool(client, "kapruka_list_delivery_cities", {
      params: {
        ...(query ? { query } : {}),
        limit,
        response_format: "json",
      },
    });
    const parsed = parseMcpPayload(result.content);
    if (!parsed.ok) {
      return Response.json({ cities: [], error: parsed.error }, { status: 502 });
    }
    if (!isRecord(parsed.data)) {
      return Response.json(
        { cities: [], error: "Unexpected city response" },
        { status: 502 }
      );
    }
    const cities = Array.isArray(parsed.data.cities)
      ? parsed.data.cities
          .map(toCity)
          .filter((city): city is City => Boolean(city))
      : [];
    return Response.json({ cities });
  } catch (error) {
    return Response.json(
      {
        cities: [],
        error: error instanceof Error ? error.message : "Unable to load cities",
      },
      { status: 502 }
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        /* ignore */
      }
    }
  }
}

function toCity(value: unknown): City | null {
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim()) {
    return null;
  }
  return {
    name: value.name,
    aliases: Array.isArray(value.aliases)
      ? value.aliases.filter((alias): alias is string => typeof alias === "string")
      : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
