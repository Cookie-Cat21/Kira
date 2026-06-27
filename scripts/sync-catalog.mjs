import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_PATH = path.join(ROOT, "data", "seed-catalog.json");

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

const CATEGORY_FILTERS = {
  cakes: {
    include: /\b(cake|gateau|cheesecake|bento|cupcake|brownie)\b/i,
    exclude: /\b(greeting\s*card|birthday\s*card|candle|biscuit|cookie|munchee|maliban|key\s*tag|puzzle)\b/i,
  },
  flowers: {
    include: /\b(flowers?|roses?|bouquet|blossom|arrangement|floral|orchid|lily)\b/i,
    exclude: /\b(greeting\s*card|birthday\s*card|key\s*tag|puzzle|candle|handmade\s*card|chocolate\s*box)\b/i,
  },
  chocolates: {
    include: /\b(choc|chocolate|kitkat|kandos|ritzbury|java|sweet|candy|toffee|nuts\s*mix)\b/i,
    exclude: /\b(condom|pharmacy|sexual|wellness)\b/i,
  },
  hampers: {
    include: /\b(hamper|basket|gift\s*box|combo|fruit|loaded\s*box|box)\b/i,
    exclude: /\b(condom|pharmacy|greeting\s*card)\b/i,
  },
  electronics: {
    include: /\b(phone|mobile|charger|adapter|speaker|watch|electronic|cable|headset|earbud|power|usb)\b/i,
    exclude: /\b(greeting\s*card|cake|flower|chocolate|condom)\b/i,
  },
  grocery: {
    include: /\b(grocery|rice|tea|coffee|milk|biscuit|munchee|maliban|oil|sugar|soap|noodle|cereal|pantry)\b/i,
    exclude: /\b(greeting\s*card|condom|flower|cake)\b/i,
  },
  kids: {
    include: /\b(kids?|children|baby|toy|puzzle|doll|game|school|soft\s*toy|plush|activity)\b/i,
    exclude: /\b(condom|pharmacy|greeting\s*card)\b/i,
  },
  home: {
    include: /\b(home|household|decor|kitchen|candle|linen|mug|vase|glass|bath|lamp)\b/i,
    exclude: /\b(condom|pharmacy|greeting\s*card)\b/i,
  },
};

let transpileDirPromise;

async function getTranspileDir() {
  if (!transpileDirPromise) {
    transpileDirPromise = mkdtemp(path.join(ROOT, ".sync-tmp-"));
  }
  return transpileDirPromise;
}

async function loadTsModule(relativePath) {
  const modulePath = path.join(ROOT, relativePath);
  const source = (await readFile(modulePath, "utf8")).replace(
    /^import\s+["']server-only["'];\s*$/m,
    ""
  );
  const transpiled = ts.transpileModule(source, {
    fileName: modulePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      resolveJsonModule: true,
    },
  });

  const outDir = await getTranspileDir();
  const outFile = path.join(
    outDir,
    relativePath.replace(/[\\/]/g, "_").replace(/\.ts$/, ".mjs")
  );
  await writeFile(outFile, transpiled.outputText, "utf8");
  return import(`${pathToFileURL(outFile).href}?t=${Date.now()}`);
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function getRawResults(parsedPayload) {
  if (!parsedPayload || parsedPayload.ok !== true) return [];
  const dataObj = toObject(parsedPayload.data);
  if (!dataObj) return [];
  const resultCandidates = [dataObj.results, dataObj.products, dataObj.items, dataObj.data];
  for (const candidate of resultCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanRecord(value) {
  const obj = toObject(value);
  return obj ?? {};
}

function normalizeProduct(inputProduct, category, rank, raw) {
  const price = Number(inputProduct.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  const fallbackImage =
    typeof inputProduct.image === "string" && inputProduct.image.trim()
      ? inputProduct.image
      : undefined;

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
    summary:
      typeof inputProduct.summary === "string" ? inputProduct.summary : undefined,
    description:
      typeof inputProduct.description === "string" ? inputProduct.description : undefined,
    price,
    currency:
      typeof inputProduct.currency === "string" && inputProduct.currency.trim()
        ? inputProduct.currency
        : "LKR",
    compareAtPrice:
      inputProduct.compareAtPrice != null
        ? Number(inputProduct.compareAtPrice)
        : inputProduct.compare_at_price != null
          ? Number(inputProduct.compare_at_price)
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

function isRelevantProduct(product, category) {
  const filter = CATEGORY_FILTERS[category.slug];
  if (!filter) return true;
  const haystack = [
    product.id,
    product.name,
    product.summary,
    product.description,
    product.category,
    product.categorySlug,
  ]
    .filter(Boolean)
    .join(" ");
  return filter.include.test(haystack) && !filter.exclude.test(haystack);
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

async function main() {
  const transpileDir = await getTranspileDir();
  let mcpClient = null;
  try {
  await loadEnvLocal();
  const dbModule = await loadTsModule("lib/db.ts");
  const mcpClientModule = await loadTsModule("lib/mcp-client.ts");
  const mcpParsingModule = await loadTsModule("lib/mcp-parsing.ts");

  const { isDbConfigured, ensureSchema, query: dbQuery } = dbModule;
  const { getMcpClient, callMcpTool } = mcpClientModule;
  const {
    extractProductsFromMcp,
    extractProductDetailsFromMcp,
    parseMcpPayload,
  } = mcpParsingModule;

  const dbConfigured = isDbConfigured();
  await ensureSchema();
  mcpClient = await getMcpClient();

  const seedCategories = [];
  const seedProducts = [];
  const counts = [];

  for (const category of CATEGORIES) {
    try {
      const byId = new Map();
      const rawById = new Map();

      for (const variation of SEARCH_VARIATIONS) {
        const result = await callMcpTool(mcpClient, "kapruka_search_products", {
          params: {
            q: category.query,
            limit: 8,
            in_stock_only: true,
            sort: variation.sort,
            response_format: "json",
          },
        });

        const parsedProducts = extractProductsFromMcp(result.content);
        const parsedPayload = parseMcpPayload(result.content);
        const rawResults = getRawResults(parsedPayload);

        for (const rawItem of rawResults) {
          const rawObj = toObject(rawItem);
          if (!rawObj) continue;
          const rawId = typeof rawObj.id === "string" ? rawObj.id : "";
          if (rawId) rawById.set(rawId, rawObj);
        }

        for (const product of parsedProducts) {
          if (!byId.has(product.id)) byId.set(product.id, product);
        }

        if (byId.size >= MAX_PRODUCTS_PER_CATEGORY) break;
        await sleep(SLEEP_MS);
      }

      const candidates = Array.from(byId.values()).slice(0, MAX_PRODUCTS_PER_CATEGORY);
      const normalized = [];

      for (let idx = 0; idx < candidates.length; idx += 1) {
        const base = candidates[idx];
        const raw = rawById.get(base.id);
        const detail = raw
          ? extractProductDetailsFromMcp(JSON.stringify(raw), base)
          : undefined;
        const normalizedProduct = normalizeProduct(detail ?? base, category, idx, raw);
        if (normalizedProduct && isRelevantProduct(normalizedProduct, category)) {
          normalized.push(normalizedProduct);
        }
      }

      seedCategories.push({
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        blurb: category.blurb,
        productCount: normalized.length,
        rank: category.rank,
      });
      seedProducts.push(
        ...normalized.map((product) =>
          Object.fromEntries(
            Object.entries(product).filter(([key]) => key !== "raw")
          )
        )
      );
      counts.push({ slug: category.slug, name: category.name, count: normalized.length });

      if (dbConfigured) {
        await dbQuery(
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
            normalized.length,
          ]
        );

        await dbQuery("update products set is_featured = false where category_slug = $1", [
          category.slug,
        ]);

        for (const product of normalized) {
          await dbQuery(
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
              product.images,
              product.category,
              product.categorySlug,
              product.url ?? null,
              product.inStock,
              product.stockLevel ?? null,
              product.variants,
              product.addons,
              product.attributes,
              product.isFeatured,
              product.rank,
              product.raw,
            ]
          );
        }

        await dbQuery(
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
  console.log("Sync summary:");
  for (const item of counts) {
    console.log(`- ${item.slug}: ${item.count}`);
  }
  console.log(`Total products: ${total}`);
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
    await rm(transpileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Catalog sync failed:", error);
  process.exit(1);
});
