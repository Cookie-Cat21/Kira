import { NextRequest, NextResponse } from "next/server";
import { getFeaturedProducts, getProductsByCategory } from "@/lib/catalog";
import type { StoreSort } from "@/types/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: StoreSort[] = ["featured", "price_asc", "price_desc", "newest"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = clampInt(sp.get("limit"), 24, 1, 60);

  try {
    if (sp.get("featured") === "1") {
      const items = await getFeaturedProducts(limit);
      return NextResponse.json({ items, total: items.length });
    }

    const category = sp.get("category");
    if (category) {
      const offset = clampInt(sp.get("offset"), 0, 0, 10_000);
      const sortParam = sp.get("sort") as StoreSort | null;
      const sort = sortParam && SORTS.includes(sortParam) ? sortParam : "featured";
      const { items, total } = await getProductsByCategory(category, {
        limit,
        offset,
        sort,
      });
      return NextResponse.json({ items, total });
    }

    const items = await getFeaturedProducts(limit);
    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json({ items: [], total: 0 });
  }
}

function clampInt(raw: string | null, dflt: number, min: number, max: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
