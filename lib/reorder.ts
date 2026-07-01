import { getColomboTomorrowIso, getColomboTodayIso } from "@/lib/colombo-date";
import type { CartItem, LastOrder } from "@/types";

export type CheckoutStep = "review" | "delivery" | "confirm";

export interface CheckoutPrefill {
  recipientName?: string;
  phone?: string;
  city?: string;
  address?: string;
  date?: string;
  giftMessage?: string;
  senderName?: string;
}

/** Bump past delivery dates to tomorrow (Asia/Colombo). */
export function normalizeReorderDate(date?: string): string {
  const tomorrow = getColomboTomorrowIso();
  if (!date) return tomorrow;
  const today = getColomboTodayIso();
  if (date < today) return tomorrow;
  return date;
}

export function lastOrderLabel(order: LastOrder): string {
  if (order.label?.trim()) return order.label.trim();
  const first = order.items[0]?.product.name;
  if (first) return first.length > 48 ? `${first.slice(0, 45)}…` : first;
  return "your last order";
}

export function checkoutPrefillFromLastOrder(order: LastOrder): CheckoutPrefill {
  return {
    recipientName: order.recipient?.name,
    phone: order.recipient?.phone,
    city: order.delivery?.city,
    address: order.delivery?.address,
    date: normalizeReorderDate(order.delivery?.date),
    giftMessage: order.giftMessage,
    senderName: order.senderName,
  };
}

/** Enough context to skip carousel and open checkout directly. */
export function hasFullReorderContext(order: LastOrder | undefined): boolean {
  if (!order?.items?.length) return false;
  const city = order.delivery?.city?.trim();
  const address = order.delivery?.address?.trim();
  const name = order.recipient?.name?.trim();
  const phone = order.recipient?.phone?.trim();
  return !!(city && address && name && phone);
}

export function cartFromLastOrder(order: LastOrder): CartItem[] {
  return order.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
  }));
}

export function inferLastOrderLabel(items: CartItem[]): string | undefined {
  const name = items[0]?.product.name ?? "";
  if (!name) return undefined;
  if (/cake/i.test(name)) return "Birthday cake order";
  if (/flower|rose|bouquet/i.test(name)) return "Flower delivery";
  if (/chocolate|choc/i.test(name)) return "Chocolate gift";
  if (/hamper/i.test(name)) return "Gift hamper";
  return undefined;
}
