import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const items = await searchProducts(q, 24);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
