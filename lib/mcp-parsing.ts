import type {
  CheckoutInfo,
  DeliveryQuote,
  KiraProduct,
  KiraProductDetails,
  KiraProductVariant,
  OrderTracking,
  ProductAddon,
  ProductShipping,
  TrackingEvent,
  TrackingItem,
} from "@/types";

type TextBlock = { type?: string; text?: string };

export type ParsedMcpPayload =
  | { ok: true; text: string; data: unknown }
  | {
      ok: false;
      text: string;
      data: null;
      error: string;
      kind: "empty" | "no-products" | "tool-error" | "text";
    };

export function readMcpText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textBlock = (content as TextBlock[]).find(
      (block) => block?.type === "text" && typeof block.text === "string"
    );
    if (textBlock?.text) return textBlock.text;
    const firstText = (content as TextBlock[]).find(
      (block) => typeof block?.text === "string"
    );
    return firstText?.text ?? "";
  }
  if (isRecord(content) && "content" in content) {
    return readMcpText(content.content);
  }
  return "";
}

export function parseMcpPayload(content: unknown): ParsedMcpPayload {
  const text = readMcpText(content).trim();
  if (!text) {
    return {
      ok: false,
      text: "",
      data: null,
      error: "Empty MCP response",
      kind: "empty",
    };
  }

  try {
    return { ok: true, text, data: JSON.parse(text) };
  } catch {
    const kind = text.startsWith("No products found")
      ? "no-products"
      : text.startsWith("Error:") || text.startsWith("Tool error:")
      ? "tool-error"
      : "text";
    return { ok: false, text, data: null, error: text, kind };
  }
}

export function formatMcpContentForModel(content: unknown): string {
  const parsed = parseMcpPayload(content);
  return parsed.ok ? JSON.stringify(parsed.data) : parsed.text || parsed.error;
}

export function extractProductsFromMcp(content: unknown, max = 6): KiraProduct[] {
  const parsed = parseMcpPayload(content);
  if (!parsed.ok) return [];

  const inner = parsed.data;
  // The live MCP returns the array under `results`; tolerate `products` / `items`
  // / `data` too so a server-side rename can't silently zero out the carousel
  // (truncateForModel already reads all of these shapes).
  const candidates = isRecord(inner)
    ? asArray(inner.results ?? inner.products ?? inner.items ?? inner.data)
    : Array.isArray(inner)
    ? inner
    : [];

  return candidates
    .slice(0, max)
    .map((item) => toKiraProduct(item))
    .filter((product): product is KiraProduct => Boolean(product));
}

export function extractProductDetailsFromMcp(
  content: unknown,
  fallback?: KiraProduct
): KiraProductDetails | undefined {
  const parsed = parseMcpPayload(content);
  if (!parsed.ok || !isRecord(parsed.data)) return undefined;

  const obj = parsed.data;
  const price = readPrice(obj.price);
  const compareAtPrice = readPrice(obj.compare_at_price);
  const category = asRecord(obj.category);
  const rawImages = asArray(obj.images)
    .filter((image): image is string => typeof image === "string")
    .filter(Boolean);
  const image = firstString(obj.image_url, fallback?.image, rawImages[0]);
  const images = [...new Set([image, ...rawImages].filter(Boolean) as string[])];

  const variants = asArray(obj.variants)
    .map(toProductVariant)
    .filter((variant): variant is KiraProductVariant => Boolean(variant));

  const addons = asArray(obj.addons ?? obj.add_ons ?? obj.addOns)
    .map(toProductAddon)
    .filter((addon): addon is ProductAddon => Boolean(addon));

  return {
    id: firstString(obj.id, fallback?.id) ?? "",
    name: firstString(obj.name, fallback?.name) ?? "Product",
    summary: firstString(obj.summary, fallback?.summary),
    description: firstString(obj.description),
    price: price.amount ?? fallback?.price ?? 0,
    currency: price.currency ?? fallback?.currency ?? "LKR",
    compareAtPrice: compareAtPrice.amount,
    image,
    images,
    category: firstString(category?.name, fallback?.category),
    url: firstString(obj.url, fallback?.url),
    inStock: readBoolean(obj.in_stock, fallback?.inStock),
    stockLevel: firstString(obj.stock_level, fallback?.stockLevel),
    variants,
    addons: addons.length > 0 ? addons : undefined,
    attributes: stringifyRecord(asRecord(obj.attributes)),
    shipping: toShipping(obj.shipping),
    isCategoryStub: Boolean(obj.is_category_stub ?? obj.category_stub),
  };
}

export function extractDeliveryInfoFromMcp(
  content: unknown
): DeliveryQuote | undefined {
  const parsed = parseMcpPayload(content);
  if (!parsed.ok || !isRecord(parsed.data)) return undefined;

  const obj = parsed.data;
  const city = firstString(obj.city, obj.destination);
  if (!city) return undefined;

  const fee = firstNumber(
    obj.rate,
    obj.fee,
    obj.delivery_fee,
    obj.shipping_fee,
    obj.cost,
    obj.delivery_cost,
    obj.price,
    obj.amount,
    findFeeDeep(obj)
  );
  const perishableWarning = firstString(obj.perishable_warning);

  return {
    available: obj.available !== false,
    city,
    checkedDate: firstString(obj.checked_date),
    estimatedDate: firstString(
      obj.estimated_date,
      obj.delivery_date,
      obj.next_available_date,
      obj.checked_date
    ),
    nextAvailableDate: firstString(obj.next_available_date),
    reason: firstString(obj.reason),
    fee,
    currency: firstString(obj.currency) ?? "LKR",
    perishable: Boolean(obj.perishable ?? obj.is_perishable ?? perishableWarning),
    perishableWarning,
  };
}

export function extractCheckoutInfoFromMcp(
  content: unknown
): CheckoutInfo | undefined {
  const parsed = parseMcpPayload(content);
  if (!parsed.ok || !isRecord(parsed.data)) return undefined;

  const obj = parsed.data;
  const checkoutUrl = firstString(obj.checkout_url, obj.checkoutUrl);
  if (!checkoutUrl) return undefined;

  const summary = asRecord(obj.summary);
  return {
    checkoutUrl,
    orderRef: firstString(obj.order_ref, obj.orderRef),
    summary: summary
      ? {
          itemsTotal: firstNumber(summary.items_total, summary.itemsTotal),
          deliveryFee: firstNumber(summary.delivery_fee, summary.deliveryFee),
          addonsTotal: firstNumber(summary.addons_total, summary.addonsTotal),
          grandTotal: firstNumber(summary.grand_total, summary.grandTotal),
          currency: firstString(summary.currency),
        }
      : undefined,
    expiresAt: firstString(obj.expires_at, obj.expiresAt),
  };
}

export function extractTrackingFromMcp(
  content: unknown
): OrderTracking | undefined {
  const parsed = parseMcpPayload(content);
  if (!parsed.ok || !isRecord(parsed.data)) return undefined;

  const obj = parsed.data;
  const rawTimeline = asArray(obj.timeline).length
    ? asArray(obj.timeline)
    : asArray(obj.progress);
  const currentStatus = firstString(
    obj.status,
    obj.current_status,
    obj.status_display
  );
  const statusDisplay = firstString(obj.status_display, obj.current_status);

  const timeline: TrackingEvent[] = rawTimeline.map((event, index) => {
    const ev = asRecord(event) ?? {};
    const status = firstString(ev.status, ev.stage, ev.step, ev.label) ?? "";
    const label =
      firstString(ev.label, ev.description, ev.step, ev.status) ||
      statusDisplay ||
      currentStatus ||
      "Processing";
    return {
      status,
      label,
      time: firstString(ev.time, ev.timestamp, ev.date),
      done: Boolean(ev.done ?? ev.completed ?? index < rawTimeline.length - 1),
    };
  });

  const orderNumber = firstString(
    obj.order_number,
    obj.order_id,
    obj.id,
    obj.pnref
  );
  if (!orderNumber && !currentStatus) return undefined;

  return {
    orderNumber: orderNumber ?? "",
    currentStatus: currentStatus ?? statusDisplay ?? "Processing",
    statusDisplay,
    orderDate: firstString(obj.order_date),
    deliveryDate: firstString(obj.delivery_date),
    timeline: timeline.length
      ? timeline
      : [
          {
            status: currentStatus ?? "processing",
            label: statusDisplay ?? currentStatus ?? "Processing",
            done: false,
          },
        ],
    liveTrackingAvailable: readBoolean(obj.live_tracking_available),
    hasDeliveryVideo: readBoolean(obj.has_delivery_video),
    hasDeliveryPhoto: readBoolean(obj.has_delivery_photo),
    items: asArray(obj.items)
      .map(toTrackingItem)
      .filter((item): item is TrackingItem => Boolean(item)),
  };
}

function toKiraProduct(item: unknown): KiraProduct | null {
  const product = asRecord(item);
  if (!product) return null;

  const price = readPrice(product.price);
  const amount = price.amount ?? firstNumber(product.price);
  if (!amount || amount <= 0) return null;

  const category = asRecord(product.category);
  return {
    id: firstString(product.id) ?? cryptoSafeId(),
    name: firstString(product.name) ?? "Product",
    summary: firstString(product.summary),
    price: amount,
    currency: price.currency ?? firstString(product.currency) ?? "LKR",
    image: firstString(product.image_url, product.image),
    category: firstString(category?.name, product.category_name),
    url: firstString(product.url),
    inStock: readBoolean(product.in_stock),
    stockLevel: firstString(product.stock_level),
  };
}

function toProductVariant(item: unknown): KiraProductVariant | null {
  const variant = asRecord(item);
  if (!variant) return null;

  const price = readPrice(variant.price);
  return {
    id: firstString(variant.id, variant.sku, variant.name) ?? cryptoSafeId(),
    name: firstString(variant.name, variant.sku) ?? "Variant",
    sku: firstString(variant.sku),
    price: price.amount ?? 0,
    currency: price.currency ?? "LKR",
    inStock: readBoolean(variant.in_stock),
    stockLevel: firstString(variant.stock_level),
    attributes: stringifyRecord(asRecord(variant.attributes)),
  };
}

function toProductAddon(item: unknown): ProductAddon | null {
  const addon = asRecord(item);
  if (!addon) return null;
  const price = readPrice(addon.price);
  if (price.amount === undefined || price.amount <= 0) return null;
  return {
    id: firstString(addon.id, addon.sku, addon.name) ?? cryptoSafeId(),
    name: firstString(addon.name, addon.label) ?? "Add-on",
    price: price.amount,
    currency: price.currency ?? "LKR",
  };
}

function toShipping(item: unknown): ProductShipping | undefined {
  const shipping = asRecord(item);
  if (!shipping) return undefined;
  return {
    shipsFrom: firstString(shipping.ships_from),
    shipsInternationally: readBoolean(shipping.ships_internationally),
    restrictedCountries: asArray(shipping.restricted_countries).filter(
      (country): country is string => typeof country === "string"
    ),
  };
}

function toTrackingItem(item: unknown): TrackingItem | null {
  const raw = asRecord(item);
  if (!raw) return null;
  return {
    productId: firstString(raw.product_id, raw.id) ?? "",
    name: firstString(raw.name) ?? "Product",
    quantity: firstNumber(raw.quantity) ?? 1,
    sellingPrice: firstNumber(raw.selling_price, raw.price),
  };
}

function readPrice(value: unknown): { amount?: number; currency?: string } {
  if (isRecord(value)) {
    return {
      amount: firstNumber(value.amount, value.value, value.price),
      currency: firstString(value.currency),
    };
  }
  return { amount: firstNumber(value) };
}

function findFeeDeep(obj: Record<string, unknown>, depth = 0): number | undefined {
  if (depth > 3) return undefined;
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("fee") ||
      lowerKey.includes("cost") ||
      lowerKey.includes("charge") ||
      lowerKey.includes("rate") ||
      lowerKey === "price" ||
      lowerKey === "amount"
    ) {
      const n = toNumber(val);
      if (n !== undefined && n > 0) return n;
    }
    if (isRecord(val)) {
      const nested = findFeeDeep(val, depth + 1);
      if (nested !== undefined) return nested;
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isRecord(item)) {
          const nested = findFeeDeep(item, depth + 1);
          if (nested !== undefined) return nested;
        }
      }
    }
  }
  return undefined;
}

function stringifyRecord(
  record: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!record) return undefined;
  const entries = Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [key, String(value)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = toNumber(value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function readBoolean(
  value: unknown,
  fallback?: boolean
): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cryptoSafeId(): string {
  return `product-${Math.random().toString(36).slice(2)}`;
}
