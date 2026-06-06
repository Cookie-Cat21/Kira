import { NextRequest, NextResponse } from "next/server";
import { createMcpClient, callMcpTool } from "@/lib/mcp-client";
import { extractCheckoutInfoFromMcp } from "@/lib/mcp-parsing";
import type { CartItem } from "@/types";

export interface CheckoutRequest {
  cart: CartItem[];
  delivery: {
    name: string;
    phone: string;
    city: string;
    address: string;
    date?: string; // YYYY-MM-DD, defaults to tomorrow
  };
  giftMessage?: string;
  senderName?: string;
}

export async function POST(req: NextRequest) {
  let mcpClient: Awaited<ReturnType<typeof createMcpClient>> | undefined;

  try {
    const body: CheckoutRequest = await req.json();
    const { cart, delivery, giftMessage, senderName } = body;

    if (!cart?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!delivery?.name?.trim() || !delivery?.city?.trim()) {
      return NextResponse.json(
        { error: "Recipient name and city are required" },
        { status: 400 }
      );
    }

    // Default delivery date to tomorrow if not provided
    const deliveryDate =
      delivery.date ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();

    mcpClient = await createMcpClient();

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

    // Build items array for create_order
    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    // kapruka_create_order schema (confirmed from validation errors):
    // recipient: { name, phone }
    // delivery:  { city, address, date }
    // cart:      [{product_id, quantity}]   ← direct list, NOT {items:[...]}
    // sender:    { name, anonymous }
    const orderArgs = {
      recipient: {
        name: delivery.name.trim(),
        phone: delivery.phone.trim() || undefined,
      },
      delivery: {
        city,
        address: delivery.address.trim() || undefined,
        date: deliveryDate,
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
  } finally {
    if (mcpClient) {
      try { await mcpClient.close(); } catch { /* ignore */ }
    }
  }
}
