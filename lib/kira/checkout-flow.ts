import { parseRelativeDeliveryDate } from "@/lib/colombo-date";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callMcpTool } from "@/lib/mcp-client";
import {
  extractCheckoutInfoFromMcp,
  extractDeliveryInfoFromMcp,
} from "@/lib/mcp-parsing";
import { L } from "@/lib/kira/localization";
import { isCheckoutConfirmation } from "@/lib/kira/permissions";
import { extractCityHint, extractFirstCity } from "@/lib/kira/search";
import { sse, streamWords, TOOL_STEPS } from "@/lib/kira/sse";
import { looksLikeMcpProductId, resolveMcpProductId } from "@/lib/product-id";
import type { CartItem, CheckoutInfo } from "@/types";

export type CheckoutDetails = {
  recipientName?: string;
  phone?: string;
  address?: string;
  city?: string;
  date?: string;
  giftMessage?: string;
};

const PHONE_RE = /(?:\+?94|0)\s*\d(?:[\s-]?\d){7,9}\b/;
const PLACE_ORDER_RE = /\bplace\s+(?:the\s+)?order\b/i;
const CHECKOUT_FILLIN_SIGNAL_RE =
  /\b(place\s+(?:the\s+)?order|recipient|gift\s+message|checkout|phone\s*[:=]?|address\s*[:=]?|deliver\s+on)\b/i;

export function isCheckoutFillInTurn(cartLength: number, text: string): boolean {
  const trimmed = text.trim();
  if (cartLength === 0) return false;
  const lower = trimmed.toLowerCase();
  return (
    CHECKOUT_FILLIN_SIGNAL_RE.test(lower) || isCheckoutConfirmation(trimmed)
  );
}

export function parseCheckoutDetailsFromText(text: string): CheckoutDetails {
  const phoneMatch = text.match(PHONE_RE);
  const phone = phoneMatch?.[0]?.replace(/[\s-]+/g, "");

  const date =
    parseRelativeDeliveryDate(text) ??
    text.match(/\bdeliver(?:y)?\s+on\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1] ??
    text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];

  const giftMessage = text
    .match(/\bgift\s+message\s*[:—-]\s*(.+)$/i)?.[1]
    ?.trim()
    .replace(/\s+$/, "");

  const recipientName = text
    .match(
      /\brecipient\s*[:—-]?\s*([A-Za-z][A-Za-z\s.'-]{2,50}?)(?=\s*,|\s+phone|\s+address|\s+deliver|\s*$)/i
    )?.[1]
    ?.trim();

  const address = text
    .match(
      /\baddress\s*[:—-]?\s*([^,]+?)(?=\s*,\s*(?:deliver|gift message)|\s+deliver\s+on|\s*$)/i
    )?.[1]
    ?.trim();

  const city = extractCityHint(text);

  return { recipientName, phone, address, city, date, giftMessage };
}

export function mergeCheckoutDetailsFromConversation(
  messages: { role: string; content: string }[],
  defaults?: { city?: string; date?: string }
): CheckoutDetails & { complete: boolean } {
  const merged: CheckoutDetails = {
    city: defaults?.city,
    date: defaults?.date,
  };

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const parsed = parseCheckoutDetailsFromText(msg.content);
    if (parsed.recipientName) merged.recipientName = parsed.recipientName;
    if (parsed.phone) merged.phone = parsed.phone;
    if (parsed.address) merged.address = parsed.address;
    if (parsed.city) merged.city = parsed.city;
    if (parsed.date) merged.date = parsed.date;
    if (parsed.giftMessage) merged.giftMessage = parsed.giftMessage;
  }

  const complete = Boolean(
    merged.recipientName?.trim() &&
      merged.phone?.trim() &&
      merged.address?.trim() &&
      merged.city?.trim() &&
      merged.date?.trim()
  );

  return { ...merged, complete };
}

async function resolveCartItems(
  mcpClient: Client,
  cart: CartItem[]
): Promise<{ items: { product_id: string; quantity: number }[] } | { error: string }> {
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
    return {
      error:
        unique.length === 1
          ? `Could not verify this item with Kapruka right now: ${unique[0]}`
          : `Could not verify some items with Kapruka right now: ${unique.join(", ")}`,
    };
  }

  if (items.some((item) => !item.product_id || item.quantity < 1)) {
    return { error: "Cart contains an invalid item" };
  }

  return { items };
}

async function canonicalizeCity(
  mcpClient: Client,
  city: string
): Promise<string> {
  const rawCity = city.replace(/^(colombo)\s*\d+$/i, "Colombo").trim();
  try {
    const cityRes = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
      params: { query: rawCity, limit: 1, response_format: "json" },
    });
    return extractFirstCity(cityRes.content) ?? rawCity;
  } catch {
    return rawCity;
  }
}

export async function placeKaprukaOrder({
  mcpClient,
  cart,
  details,
  controller,
  language,
}: {
  mcpClient: Client;
  cart: CartItem[];
  details: CheckoutDetails;
  controller: ReadableStreamDefaultController<Uint8Array>;
  language: string;
}): Promise<CheckoutInfo | undefined> {
  const resolved = await resolveCartItems(mcpClient, cart);
  if ("error" in resolved) {
    await streamWords(controller, resolved.error);
    return undefined;
  }

  const city = await canonicalizeCity(mcpClient, details.city!.trim());

  controller.enqueue(sse("step", TOOL_STEPS.kapruka_create_order));

  const orderArgs = {
    recipient: {
      name: details.recipientName!.trim(),
      phone: details.phone!.trim(),
    },
    delivery: {
      city,
      address: details.address!.trim(),
      date: details.date!.trim(),
    },
    cart: resolved.items,
    sender: { name: "Anonymous", anonymous: true },
    ...(details.giftMessage?.trim()
      ? { gift_message: details.giftMessage.trim() }
      : {}),
    response_format: "json",
  };

  const result = await callMcpTool(mcpClient, "kapruka_create_order", {
    params: orderArgs,
  });
  const checkoutInfo = extractCheckoutInfoFromMcp(result.content);
  if (!checkoutInfo?.checkoutUrl) {
    await streamWords(
      controller,
      language === "si"
        ? "Order link හදන්න බැරි වුණා — ටිකක් වෙලා ඉඳලා try කරන්න."
        : language === "ta"
        ? "Order link create ஆகல — சிறிது நேரம் கழித்து try செய்யுங்கள்."
        : "I couldn't get a live checkout link just now — try again in a moment?"
    );
    return undefined;
  }

  controller.enqueue(sse("checkout", checkoutInfo));
  controller.enqueue(sse("payLink", checkoutInfo.checkoutUrl));
  await streamWords(
    controller,
    language === "si"
      ? `Order ready! Secure Kapruka payment link එක open කරන්න — ref **${checkoutInfo.orderRef ?? "pending"}**.`
      : language === "ta"
      ? `Order ready! Secure Kapruka payment link open செய்யுங்கள் — ref **${checkoutInfo.orderRef ?? "pending"}**.`
      : `Order ready! Open the secure Kapruka payment link to finish — ref **${checkoutInfo.orderRef ?? "pending"}**.`
  );
  return checkoutInfo;
}

export async function handleCheckoutFillIn({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  mcpClient,
  controller,
  language,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  mcpClient: Client;
  controller: ReadableStreamDefaultController<Uint8Array>;
  language: string;
}): Promise<boolean> {
  const details = mergeCheckoutDetailsFromConversation(messages, {
    city: deliveryCity,
    date: deliveryDate,
  });

  if (!details.recipientName) {
    await streamWords(controller, L("checkoutNeedName", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (!details.phone) {
    await streamWords(controller, L("checkoutNeedPhone", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (!details.address) {
    await streamWords(controller, L("checkoutNeedAddress", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (!details.city) {
    await streamWords(
      controller,
      language === "si"
        ? "Delivery city එක කියන්නකෝ — Colombo, Kandy, Galle..."
        : language === "ta"
        ? "Delivery city சொல்லுங்கள் — Colombo, Kandy, Galle..."
        : "Which city should Kapruka deliver to?"
    );
    controller.enqueue(sse("done"));
    return true;
  }
  if (!details.date) {
    await streamWords(
      controller,
      language === "si"
        ? "Delivery date එක කියන්නකෝ — හෙට හෝ YYYY-MM-DD format එකෙන්."
        : language === "ta"
        ? "Delivery date சொல்லுங்கள் — tomorrow அல்லது YYYY-MM-DD."
        : "What delivery date should I use? Tomorrow works, or give me YYYY-MM-DD."
    );
    controller.enqueue(sse("done"));
    return true;
  }

  const itemsTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  let deliveryFee = 450;
  const primaryProduct = cart[0]?.product;
  if (primaryProduct?.id) {
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
    try {
      const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: details.city,
          product_id: primaryProduct.id,
          delivery_date: details.date,
          response_format: "json",
        },
      });
      const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
      if (deliveryInfo?.fee !== undefined) deliveryFee = deliveryInfo.fee;
      if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    } catch {
      // non-fatal — use estimate
    }
  }

  const grandTotal = itemsTotal + deliveryFee;
  const shouldPlace =
    isCheckoutConfirmation(text) || PLACE_ORDER_RE.test(text.trim());

  if (!shouldPlace) {
    await streamWords(
      controller,
      `That's LKR ${itemsTotal.toLocaleString("en-LK")} + LKR ${deliveryFee.toLocaleString("en-LK")} delivery = **LKR ${grandTotal.toLocaleString("en-LK")}** to ${details.city}. Shall I place it?`
    );
    controller.enqueue(sse("done"));
    return true;
  }

  await placeKaprukaOrder({
    mcpClient,
    cart,
    details,
    controller,
    language,
  });
  controller.enqueue(sse("done"));
  return true;
}
