import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_PATH = path.join(ROOT, "data", "seed-catalog.json");
const MCP_URL = "https://mcp.kapruka.com/mcp";

const SLEEP_MS = 1_200;
const MAX_PRODUCTS_PER_CATEGORY = 12;
const FEATURED_PER_CATEGORY = 3;

const CATEGORIES = [
  { slug: "cakes", name: "Cakes & Bakery", icon: "CakeSlice", query: "cake", blurb: "Freshly baked, delivered islandwide", rank: 1 },
  { slug: "flowers", name: "Flowers", icon: "Flower2", query: "flowers bouquet", blurb: "Hand-tied bouquets & arrangements", rank: 2 },
  { slug: "chocolates", name: "Chocolates", icon: "Gift", query: "chocolate", blurb: "Imported & local indulgence", rank: 3 },
  { slug: "hampers", name: "Gift Hampers", icon: "Package", query: "gift hamper", blurb: "Curated boxes for every occasion", rank: 4 },
  { slug: "electronics", name: "Electronics", icon: "Smartphone", query: "electronics", blurb: "Phones, audio & gadgets", rank: 5 },
  { slug: "grocery", name: "Grocery", icon: "ShoppingBasket", query: "grocery", blurb: "Weekly essentials & pantry", rank: 6 },
  { slug: "kids", name: "Kids & Toys", icon: "Baby", query: "soft toys kids", blurb: "Soft toys, games & gifts", rank: 7 },
  { slug: "home", name: "Home & Lifestyle", icon: "Home", query: "home lifestyle", blurb: "Decor, kitchen & living", rank: 8 },
];

const SEARCH_VARIATIONS = [
  { sort: "bestseller" },
  { sort: "price_asc" },
  { sort: "newest" },
];

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function readMcpText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const block = content.find((item) => item?.type === "text" && typeof item.text === "string");
    return block?.text ?? content.find((item) => typeof item?.text === "string")?.text ?? "";
  }
  return "";
}

function parseMcpPayload(content) {
  const text = readMcpText(content).trim();
  if (!text) return { ok: false, data: null };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: null };
  }
}

function getRawResults(parsedPayload) {
  if (!parsedPayload?.ok) return [];
  const dataObj = toObject(parsedPayload.data);
  if (!dataObj) return [];
  for (const key of ["results", "products", "items", "data"]) {
    if (Array.isArray(dataObj[key])) return dataObj[key];
  }
  return [];
}

function readPrice(value) {
  if (toObject(value)) {
    const obj = toObject(value);
    const amount = Number(obj.amount ?? obj.value ?? obj.price ?? 0);
    return {
      amount: Number.isFinite(amount) ? amount : 0,
      currency: typeof obj.currency === "string" ? obj.currency : "LKR",
    };
  }
  const amount = Number(value ?? 0);
  return { amount: Number.isFinite(amount) ? amount : 0, currency: "LKR" };
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanRecord(value) {
  return toObject(value) ?? {};
}

function resolveImage(inputProduct) {
  const candidates = [
    inputProduct.image,
    inputProduct.image_url,
    ...(Array.isArray(inputProduct.images) ? inputProduct.images : []),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

const HAMPER_RELEVANCE =
  /hamper|gift\s*box|gift\s*set|combo\s*pack|gift\s*basket|hamper\s*box|curated|munch\s*box|pantry|celebration\s*box|festive|joyful|family\s*pack|classic\s*craving|luxury\s*pantry|cravings|treats\s*hamper|grocery\s*hamper|supermarket\s*hamper/i;
const HAMPER_JUNK =
  /body\s*soap|bar\s*soap|cleanser|king\s*coconut|thambili|\bcoconut\b(?!.*hamper)|lifebuoy|pvt\s*ltd|shop all products from|\/partner\/|brand\s*:\s*kapruka|confectionery and biscuits\b(?!.*hamper)/i;

function isRealHamperCatalogProduct(product) {
  const txt = `${product.name ?? ""} ${product.summary ?? ""}`;
  return HAMPER_RELEVANCE.test(txt) && !HAMPER_JUNK.test(txt);
}

function normalizeProduct(inputProduct, category, rank, raw) {
  const price = readPrice(inputProduct.price);
  if (!price.amount || price.amount <= 0) return null;

  const fallbackImage = resolveImage(inputProduct);
  const images = Array.isArray(inputProduct.images)
    ? inputProduct.images.filter((item) => typeof item === "string" && item.trim())
    : fallbackImage
      ? [fallbackImage]
      : [];

  const id = String(inputProduct.id ?? "").trim();
  const name = String(inputProduct.name ?? "").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    summary: typeof inputProduct.summary === "string" ? inputProduct.summary : undefined,
    description:
      typeof inputProduct.description === "string" ? inputProduct.description : undefined,
    price: price.amount,
    currency:
      typeof inputProduct.currency === "string" && inputProduct.currency.trim()
        ? inputProduct.currency
        : price.currency,
    compareAtPrice:
      inputProduct.compareAtPrice != null
        ? Number(inputProduct.compareAtPrice)
        : inputProduct.compare_at_price != null
          ? readPrice(inputProduct.compare_at_price).amount
          : undefined,
    image: fallbackImage,
    images,
    category: category.name,
    categorySlug: category.slug,
    url: typeof inputProduct.url === "string" ? inputProduct.url : undefined,
    inStock:
      typeof inputProduct.inStock === "boolean"
        ? inputProduct.inStock
        : typeof inputProduct.in_stock === "boolean"
          ? inputProduct.in_stock
          : true,
    stockLevel:
      typeof inputProduct.stockLevel === "string"
        ? inputProduct.stockLevel
        : typeof inputProduct.stock_level === "string"
          ? inputProduct.stock_level
          : undefined,
    variants: cleanArray(inputProduct.variants),
    addons: cleanArray(inputProduct.addons),
    attributes: cleanRecord(inputProduct.attributes),
    isFeatured: rank < FEATURED_PER_CATEGORY,
    rank,
    raw: raw ?? null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const raw = trimmed.slice(eqIndex + 1).trim();
    if (!key || process.env[key]) continue;
    const unquoted =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
    process.env[key] = unquoted;
  }
}

async function connectMcp() {
  const client = new Client({ name: "kira-sync", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  return client;
}

async function callMcpTool(client, name, params) {
  return client.callTool({ name, arguments: { params } });
}

async function ensureSchema(pool) {
  const schemaPath = path.join(ROOT, "db", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
}

async function main() {
  await loadEnvLocal();

  const dbConfigured = Boolean(process.env.DATABASE_URL);
  const pool = dbConfigured
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
    : null;

  let mcpClient = null;
  try {
    if (pool) await ensureSchema(pool);
    mcpClient = await connectMcp();

    const seedCategories = [];
    const seedProducts = [];
    const counts = [];

    for (const category of CATEGORIES) {
      try {
        const rawById = new Map();

        for (const variation of SEARCH_VARIATIONS) {
          const result = await callMcpTool(mcpClient, "kapruka_search_products", {
            q: category.query,
            limit: 8,
            in_stock_only: true,
            sort: variation.sort,
            response_format: "json",
          });

          const parsedPayload = parseMcpPayload(result.content);
          const rawResults = getRawResults(parsedPayload);

          for (const rawItem of rawResults) {
            const rawObj = toObject(rawItem);
            if (!rawObj) continue;
            const rawId = typeof rawObj.id === "string" ? rawObj.id : "";
            if (rawId && !rawById.has(rawId)) rawById.set(rawId, rawObj);
          }

          if (rawById.size >= MAX_PRODUCTS_PER_CATEGORY) break;
          await sleep(SLEEP_MS);
        }

        const normalized = Array.from(rawById.values())
          .slice(0, MAX_PRODUCTS_PER_CATEGORY)
          .map((raw, idx) => normalizeProduct(raw, category, idx, raw))
          .filter(Boolean);

        const catalogReady =
          category.slug === "hampers"
            ? normalized.filter((product) => isRealHamperCatalogProduct(product))
            : normalized;

        seedCategories.push({
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          blurb: category.blurb,
          productCount: catalogReady.length,
          rank: category.rank,
        });
        seedProducts.push(...catalogReady.map(({ raw, ...product }) => product));
        counts.push({ slug: category.slug, name: category.name, count: catalogReady.length });

        if (pool) {
          await pool.query(
            `insert into categories (slug, name, icon, blurb, rank, product_count, updated_at)
             values ($1, $2, $3, $4, $5, $6, now())
             on conflict (slug) do update set
               name = excluded.name,
               icon = excluded.icon,
               blurb = excluded.blurb,
               rank = excluded.rank,
               product_count = excluded.product_count,
               updated_at = now()`,
            [
              category.slug,
              category.name,
              category.icon,
              category.blurb,
              category.rank,
              catalogReady.length,
            ]
          );

          await pool.query("update products set is_featured = false where category_slug = $1", [
            category.slug,
          ]);

          for (const product of catalogReady) {
            await pool.query(
              `insert into products (
                id, name, summary, description, price, currency, compare_at_price,
                image, images, category, category_slug, url, in_stock, stock_level,
                variants, addons, attributes, is_featured, rank, raw, synced_at
              ) values (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, now()
              )
              on conflict (id) do update set
                name = excluded.name,
                summary = excluded.summary,
                description = excluded.description,
                price = excluded.price,
                currency = excluded.currency,
                compare_at_price = excluded.compare_at_price,
                image = excluded.image,
                images = excluded.images,
                category = excluded.category,
                category_slug = excluded.category_slug,
                url = excluded.url,
                in_stock = excluded.in_stock,
                stock_level = excluded.stock_level,
                variants = excluded.variants,
                addons = excluded.addons,
                attributes = excluded.attributes,
                is_featured = excluded.is_featured,
                rank = excluded.rank,
                raw = excluded.raw,
                synced_at = now()`,
              [
                product.id,
                product.name,
                product.summary ?? null,
                product.description ?? null,
                product.price,
                product.currency,
                product.compareAtPrice ?? null,
                product.image ?? null,
                JSON.stringify(product.images),
                product.category,
                product.categorySlug,
                product.url ?? null,
                product.inStock,
                product.stockLevel ?? null,
                JSON.stringify(product.variants),
                JSON.stringify(product.addons),
                JSON.stringify(product.attributes),
                product.isFeatured,
                product.rank,
                JSON.stringify(product.raw),
              ]
            );
          }

          await pool.query(
            `delete from products
             where category_slug = $1
               and not (id = any($2::text[]))`,
            [category.slug, normalized.map((product) => product.id)]
          );
        }
      } catch (error) {
        counts.push({ slug: category.slug, name: category.name, count: 0 });
        seedCategories.push({
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          blurb: category.blurb,
          productCount: 0,
          rank: category.rank,
        });
        console.error(`Category sync failed for ${category.slug}:`, error);
      }
    }

    await mkdir(path.dirname(SEED_PATH), { recursive: true });
    await writeFile(
      SEED_PATH,
      `${JSON.stringify({ categories: seedCategories, products: seedProducts }, null, 2)}\n`,
      "utf8"
    );

    const total = counts.reduce((sum, item) => sum + item.count, 0);
    const withImages = seedProducts.filter((product) => product.image).length;
    console.log("Sync summary:");
    for (const item of counts) {
      console.log(`- ${item.slug}: ${item.count}`);
    }
    console.log(`Total products: ${total}`);
    console.log(`Products with images: ${withImages}`);
    console.log(`Snapshot written: ${SEED_PATH}`);
    console.log(`Database writes: ${dbConfigured ? "enabled" : "skipped (DATABASE_URL unset)"}`);
  } finally {
    if (mcpClient && typeof mcpClient.close === "function") {
      try {
        await mcpClient.close();
      } catch {
        // ignore client close errors on shutdown
      }
    }
    if (pool) await pool.end();
  }
}

main().catch((error) => {
  console.error("Catalog sync failed:", error);
  process.exit(1);
});
