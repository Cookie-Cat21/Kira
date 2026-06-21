import { NextRequest, NextResponse } from "next/server";
import { getMcpClient, callMcpTool } from "@/lib/mcp-client";
import { extractCheckoutInfoFromMcp } from "@/lib/mcp-parsing";
import {
  buildSandboxCheckoutInfo,
  isSandboxCheckout,
} from "@/lib/checkout-sandbox";
import { getColomboTodayIso } from "@/lib/colombo-date";
import { looksLikeMcpProductId, resolveMcpProductId } from "@/lib/product-id";
import type { CartItem } from "@/types";

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
    if (delivery.date < getColomboTodayIso()) {
      return NextResponse.json(
        { error: "Delivery date cannot be in the past" },
        { status: 400 }
      );
    }

    if (isSandboxCheckout(req)) {
      return NextResponse.json({
        checkoutInfo: buildSandboxCheckoutInfo(cart),
        mode: "sandbox",
      });
    }

    const mcpClient = await getMcpClient();

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
