// Server-only catalog read layer.
// Strategy: when the DB is configured, read from Postgres; on ANY failure (or
// when unconfigured) fall back to data/seed-catalog.json so the storefront keeps
// working even if the MCP / DB are down. Live actions (delivery, checkout,
// tracking) stay on the MCP via the existing Kira chat — this layer is catalog only.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { KiraProduct, KiraProductDetails } from "@/types";
import type { ProductRail, StoreCategory, StoreSort } from "@/types/store";
import { filterFamilySafeProducts, filterProductsForSearch } from "@/lib/kira/search";
import { isDbConfigured, query } from "@/lib/db";

// ── Seed (fallback) ────────────────────────────────────────────────────────

interface SeedProduct {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  price: number;
  currency?: string;
  compareAtPrice?: number;
  image?: string;
  images?: string[];
  category?: string;
  categorySlug?: string;
  url?: string;
  inStock?: boolean;
  stockLevel?: string;
  variants?: unknown[];
  addons?: unknown[];
  attributes?: Record<string, string>;
  isFeatured?: boolean;
  rank?: number;
}
interface SeedFile {
  categories: (StoreCategory & { rank?: number })[];
  products: SeedProduct[];
}

let seedCache: SeedFile | null = null;
let seedMtime = 0;

function seed(): SeedFile {
  try {
    const file = path.join(process.cwd(), "data", "seed-catalog.json");
    const mtime = statSync(file).mtimeMs;
    if (seedCache && mtime === seedMtime) return seedCache;
    seedCache = JSON.parse(readFileSync(file, "utf8")) as SeedFile;
    seedMtime = mtime;
  } catch {
    seedCache = { categories: [], products: [] };
    seedMtime = 0;
  }
  return seedCache;
}

function resolveProductImage(
  image?: string | null,
  images?: unknown
): string | undefined {
  if (typeof image === "string" && image.trim()) return image.trim();
  return asStringArray(images)[0];
}

function seedToProduct(p: SeedProduct): KiraProduct {
  return {
    id: p.id,
    name: p.name,
    summary: p.summary,
    price: p.price,
    currency: p.currency ?? "LKR",
    image: resolveProductImage(p.image, p.images),
    category: p.category,
    url: p.url,
    inStock: p.inStock ?? true,
    stockLevel: p.stockLevel,
  };
}

// ── DB row mapping (column names mirror db/schema.sql in the Codex prompt) ──

interface DbRow {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  price: string | number;
  currency: string | null;
  compare_at_price: string | number | null;
  image: string | null;
  images: unknown;
  category: string | null;
  category_slug: string | null;
  url: string | null;
  in_stock: boolean | null;
  stock_level: string | null;
  variants: unknown;
  addons: unknown;
  attributes: unknown;
  is_featured: boolean | null;
  rank: number | null;
}

function rowToProduct(r: DbRow): KiraProduct {
  return {
    id: r.id,
    name: r.name,
    summary: r.summary ?? undefined,
    price: Number(r.price),
    currency: r.currency ?? "LKR",
    image: resolveProductImage(r.image, r.images),
    category: r.category ?? undefined,
    url: r.url ?? undefined,
    inStock: r.in_stock ?? true,
    stockLevel: r.stock_level ?? undefined,
  };
}

const PRODUCT_COLS =
  "id, name, summary, description, price, currency, compare_at_price, image, images, category, category_slug, url, in_stock, stock_level, variants, addons, attributes, is_featured, rank";

async function db<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!isDbConfigured()) return fallback();
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

const ORDER: Record<StoreSort, string> = {
  featured: "is_featured desc, rank asc",
  price_asc: "price asc",
  price_desc: "price desc",
  newest: "synced_at desc nulls last",
};

// ── Public API ───────────────────────────────────────────────────────────

export async function getCategories(): Promise<StoreCategory[]> {
  return db(
    async () => {
      const rows = await query<StoreCategory & { product_count: number }>(
        "select slug, name, icon, blurb, coalesce(product_count,0) as product_count from categories order by rank asc, name asc"
      );
      return rows.map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: c.icon ?? undefined,
        blurb: c.blurb ?? undefined,
        productCount: Number(c.product_count) || 0,
      }));
    },
    () =>
      [...seed().categories]
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          icon: c.icon,
          blurb: c.blurb,
          productCount: c.productCount,
        }))
  );
}

export async function getFeaturedProducts(limit = 12): Promise<KiraProduct[]> {
  return db(
    async () => {
      const rows = await query<DbRow>(
        `select ${PRODUCT_COLS} from products where is_featured = true order by rank asc limit $1`,
        [limit]
      );
      return rows.map(rowToProduct);
    },
    () =>
      seed()
        .products.filter((p) => p.isFeatured)
        .slice(0, limit)
        .map(seedToProduct)
  );
}

const CATEGORY_FILTER_QUERY: Record<string, string> = {
  hampers: "gift hamper",
  flowers: "flowers",
  chocolates: "chocolate",
  cakes: "cake",
};

function applyCategoryCatalogFilter(slug: string, items: KiraProduct[]): KiraProduct[] {
  const query = CATEGORY_FILTER_QUERY[slug];
  if (query) return filterProductsForSearch(items, query);
  return filterFamilySafeProducts(items);
}

export async function getProductsByCategory(
  slug: string,
  opts: { limit?: number; offset?: number; sort?: StoreSort } = {}
): Promise<{ items: KiraProduct[]; total: number }> {
  const { limit = 24, offset = 0, sort = "featured" } = opts;
  return db(
    async () => {
      const rows = await query<DbRow>(
        `select ${PRODUCT_COLS} from products where category_slug = $1 order by ${ORDER[sort]}`,
        [slug]
      );
      const filtered = applyCategoryCatalogFilter(slug, rows.map(rowToProduct));
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    },
    () => {
      let items = seed().products.filter((p) => p.categorySlug === slug);
      items = sortSeed(items, sort);
      items = applyCategoryCatalogFilter(slug, items.map(seedToProduct));
      const total = items.length;
      return {
        items: items.slice(offset, offset + limit),
        total,
      };
    }
  );
}

export async function getProduct(id: string): Promise<KiraProductDetails | null> {
  return db(
    async () => {
      const rows = await query<DbRow>(
        `select ${PRODUCT_COLS} from products where id = $1 limit 1`,
        [id]
      );
      if (!rows[0]) return seedDetails(id);
      const r = rows[0];
      return {
        ...rowToProduct(r),
        description: r.description ?? undefined,
        images: asStringArray(r.images, r.image),
        compareAtPrice:
          r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
        variants: [],
        addons: [],
        attributes: asRecord(r.attributes),
      };
    },
    () => seedDetails(id)
  );
}

export async function searchProducts(q: string, limit = 24): Promise<KiraProduct[]> {
  const term = q.trim();
  if (!term) return [];
  return db(
    async () => {
      const rows = await query<DbRow>(
        `select ${PRODUCT_COLS} from products where name ilike $1 or summary ilike $1 order by is_featured desc, rank asc limit $2`,
        [`%${term}%`, limit]
      );
      return filterFamilySafeProducts(rows.map(rowToProduct));
    },
    () => {
      const t = term.toLowerCase();
      return filterFamilySafeProducts(
        seed()
          .products.filter(
            (p) =>
              p.name.toLowerCase().includes(t) ||
              (p.summary ?? "").toLowerCase().includes(t) ||
              (p.category ?? "").toLowerCase().includes(t)
          )
          .slice(0, limit)
          .map(seedToProduct)
      );
    }
  );
}

export async function getRails(): Promise<ProductRail[]> {
  const [featured, bakery, gifts] = await Promise.all([
    getFeaturedProducts(10),
    getProductsByCategory("cakes", { limit: 10 }),
    cheapGifts(10),
  ]);
  const rails: ProductRail[] = [];
  if (featured.length)
    rails.push({
      title: "Trending today",
      subtitle: "What everyone's sending",
      items: featured,
    });
  if (bakery.items.length)
    rails.push({
      title: "Fresh from the bakery",
      subtitle: "Baked & delivered cool",
      items: bakery.items,
      categorySlug: "cakes",
    });
  if (gifts.length)
    rails.push({ title: "Gifts under LKR 5,000", subtitle: "Thoughtful, not pricey", items: gifts });
  return rails;
}

async function cheapGifts(limit: number): Promise<KiraProduct[]> {
  return db(
    async () => {
      const rows = await query<DbRow>(
        `select ${PRODUCT_COLS} from products where price <= 5000 order by price asc limit $1`,
        [limit]
      );
      return rows.map(rowToProduct);
    },
    () =>
      seed()
        .products.filter((p) => p.price <= 5000)
        .sort((a, b) => a.price - b.price)
        .slice(0, limit)
        .map(seedToProduct)
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function sortSeed(items: SeedProduct[], sort: StoreSort): SeedProduct[] {
  const arr = [...items];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "newest":
      return arr;
    default:
      return arr.sort(
        (a, b) =>
          Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false) ||
          (a.rank ?? 0) - (b.rank ?? 0)
      );
  }
}

function seedDetails(id: string): KiraProductDetails | null {
  const p = seed().products.find((x) => x.id === id);
  if (!p) return null;
  const hero = resolveProductImage(p.image, p.images);
  return {
    ...seedToProduct(p),
    description: p.description,
    images: hero ? [hero, ...asStringArray(p.images).filter((url) => url !== hero)] : asStringArray(p.images),
    compareAtPrice: p.compareAtPrice,
    variants: [],
    addons: [],
    attributes: p.attributes,
  };
}

function asStringArray(value: unknown, fallback?: string | null): string[] {
  if (Array.isArray(value)) {
    const arr = value.filter((v): v is string => typeof v === "string");
    if (arr.length) return arr;
  }
  return fallback ? [fallback] : [];
}

function asRecord(value: unknown): Record<string, string> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v != null) out[k] = String(v);
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}
