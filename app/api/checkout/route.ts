import { NextRequest, NextResponse } from "next/server";
import { getMcpClient, callMcpTool } from "@/lib/mcp-client";
import { extractCheckoutInfoFromMcp, extractProductsFromMcp } from "@/lib/mcp-parsing";
import type { CartItem, CheckoutInfo } from "@/types";

export interface CheckoutRequest {
  cart: CartItem[];
  delivery: {
    name: string;
    phone: string;
    city: string;
    address: string;
    date: string; // YYYY-MM-DD
  };
  giftMessage?: string;
  senderName?: string;
}

function isSandboxCheckout(req: NextRequest): boolean {
  return (
    process.env.KIRA_CHECKOUT_MODE === "sandbox" ||
    (process.env.NODE_ENV !== "production" &&
      req.headers.get("x-kira-checkout-mode") === "sandbox")
  );
}

function buildSandboxCheckoutInfo(
  cart: CartItem[]
): CheckoutInfo {
  const itemsTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const deliveryFee = 450;
  const ref = `KIRA-SANDBOX-${Date.now().toString(36).toUpperCase()}`;
  return {
    checkoutUrl: `https://www.kapruka.com/checkout/${ref.toLowerCase()}`,
    orderRef: ref,
    summary: {
      itemsTotal,
      deliveryFee,
      addonsTotal: 0,
      grandTotal: itemsTotal + deliveryFee,
      currency: cart[0]?.product.currency ?? "LKR",
    },
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function looksLikeMcpProductId(id: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(id);
}

async function resolveMcpProductId(
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>,
  item: CartItem,
  cache: Map<string, string>
): Promise<string> {
  const rawId = String(item.product.id ?? "").trim();
  if (!rawId) return "";
  if (looksLikeMcpProductId(rawId)) return rawId;

  const name = String(item.product.name ?? "").trim();
  if (!name) return rawId;
  const cacheKey = normalizeName(name);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: name,
        limit: 6,
        in_stock_only: true,
        response_format: "json",
      },
    });
    const candidates = extractProductsFromMcp(searchResult.content);
    if (candidates.length === 0) return rawId;

    const exact = candidates.find(
      (candidate) => normalizeName(candidate.name) === cacheKey
    );
    const resolved = String((exact ?? candidates[0]).id ?? "").trim();
    if (resolved) cache.set(cacheKey, resolved);
    return resolved || rawId;
  } catch {
    return rawId;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutRequest = await req.json();
    const { cart, delivery, giftMessage, senderName } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!delivery?.name?.trim()) {
      return NextResponse.json(
        { error: "Recipient name is required" },
        { status: 400 }
      );
    }
    if (!delivery.phone?.trim()) {
      return NextResponse.json(
        { error: "Recipient phone number is required" },
        { status: 400 }
      );
    }
    if (!delivery.city?.trim()) {
      return NextResponse.json(
        { error: "Delivery city is required" },
        { status: 400 }
      );
    }
    if (!delivery.address?.trim()) {
      return NextResponse.json(
        { error: "Street address is required" },
        { status: 400 }
      );
    }
    if (!delivery.date?.trim()) {
      return NextResponse.json(
        { error: "Delivery date is required" },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(delivery.date)) {
      return NextResponse.json(
        { error: "Delivery date must use YYYY-MM-DD" },
        { status: 400 }
      );
    }
    if (delivery.date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json(
        { error: "Delivery date cannot be in the past" },
        { status: 400 }
      );
    }

    // Demo-safe order mode. This exercises the full checkout UI and validation
    // without creating a real Kapruka order. Production still uses live MCP
    // unless KIRA_CHECKOUT_MODE=sandbox is explicitly set.
    if (isSandboxCheckout(req)) {
      return NextResponse.json({
        checkoutInfo: buildSandboxCheckoutInfo(cart),
        mode: "sandbox",
      });
    }

    const mcpClient = await getMcpClient();

    // Resolve canonical city name via MCP (e.g. "Colombo" → "Colombo 01")
    // Strip suburb numbers first so "Colombo 6" → "Colombo" before lookup
    const rawCity = delivery.city.replace(/^(colombo)\s*\d+$/i, "Colombo").trim();
    let city = rawCity;
    try {
      const cityRes = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
        params: { query: rawCity, limit: 1, response_format: "json" },
      });
      const cityText = (cityRes.content as { text?: string }[])?.[0]?.text ?? "";
      const parsed = JSON.parse(cityText) as { cities?: { name?: string }[] };
      const canonical = parsed.cities?.[0]?.name;
      if (canonical) city = canonical;
    } catch {
      // non-fatal — proceed with the raw city name
    }

    // Build items array for create_order; store/seed product ids can be local slugs
    // (e.g. "cakes-01"), so resolve them to MCP ids when needed.
    const idResolutionCache = new Map<string, string>();
    const unresolvedNames: string[] = [];
    const items = [];
    for (const item of cart) {
      const resolvedId = await resolveMcpProductId(mcpClient, item, idResolutionCache);
      if (!looksLikeMcpProductId(resolvedId)) {
        unresolvedNames.push(item.product.name || item.product.id || "item");
      }
      items.push({
        product_id: resolvedId,
        quantity: Math.trunc(item.quantity),
      });
    }

    if (unresolvedNames.length > 0) {
      const unique = [...new Set(unresolvedNames)];
      return NextResponse.json(
        {
          error:
            unique.length === 1
              ? `Could not verify this item with Kapruka right now: ${unique[0]}`
              : `Could not verify some items with Kapruka right now: ${unique.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (items.some((item) => !item.product_id || item.quantity < 1)) {
      return NextResponse.json(
        { error: "Cart contains an invalid item" },
        { status: 400 }
      );
    }

    // kapruka_create_order schema (confirmed from validation errors):
    // recipient: { name, phone }
    // delivery:  { city, address, date }
    // cart:      [{product_id, quantity}]   ← direct list, NOT {items:[...]}
    // sender:    { name, anonymous }
    const orderArgs = {
      recipient: {
        name: delivery.name.trim(),
        phone: delivery.phone.trim(),
      },
      delivery: {
        city,
        address: delivery.address.trim(),
        date: delivery.date,
      },
      cart: items,
      sender: senderName?.trim()
        ? { name: senderName.trim(), anonymous: false }
        : { name: "Anonymous", anonymous: true },
      ...(giftMessage?.trim() ? { gift_message: giftMessage.trim() } : {}),
      response_format: "json",
    };

    const result = await callMcpTool(mcpClient, "kapruka_create_order", {
      params: orderArgs,
    });

    const checkoutInfo = extractCheckoutInfoFromMcp(result.content);
    if (!checkoutInfo?.checkoutUrl) {
      console.error("[checkout] create_order returned no URL:", result.content);
      return NextResponse.json(
        { error: "Order creation failed — no checkout URL returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({ checkoutInfo });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json(
      { error: "Something went wrong placing the order" },
      { status: 500 }
    );
  }
}
