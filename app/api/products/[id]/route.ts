import { NextRequest } from "next/server";
import { createMcpClient, callMcpTool } from "@/lib/mcp-client";
import {
  extractProductDetailsFromMcp,
  parseMcpPayload,
} from "@/lib/mcp-parsing";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const productId = decodeURIComponent(id ?? "").trim();

  if (!productId) {
    return Response.json({ error: "Missing product id" }, { status: 400 });
  }

  let client: Awaited<ReturnType<typeof createMcpClient>> | undefined;
  try {
    client = await createMcpClient();
    const currency = req.nextUrl.searchParams.get("currency") ?? "LKR";
    const result = await callMcpTool(client, "kapruka_get_product", {
      params: {
        product_id: productId,
        currency,
        response_format: "json",
      },
    });
    const product = extractProductDetailsFromMcp(result.content);

    if (!product) {
      const parsed = parseMcpPayload(result.content);
      return Response.json(
        { error: parsed.ok ? "Product details unavailable" : parsed.error },
        { status: parsed.ok ? 502 : 404 }
      );
    }

    return Response.json({ product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch product details";
    return Response.json({ error: message }, { status: 502 });
  }
}
