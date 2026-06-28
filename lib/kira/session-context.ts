import type { CartItem, KiraProduct } from "@/types";
import { parseBudgetAmount } from "@/lib/kira/catalog-guard";

export function sanitizeField(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\r\n]+/g, " ").trim().slice(0, maxLen);
}

export function validateLastProducts(lastProducts?: KiraProduct[]): KiraProduct[] {
  if (!Array.isArray(lastProducts)) return [];
  return lastProducts.filter(
    (p): p is KiraProduct =>
      p != null &&
      typeof p === "object" &&
      typeof p.name === "string" &&
      typeof p.price === "number"
  );
}

export type SessionContextInput = {
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
  lastProducts?: KiraProduct[];
};

/** Volatile per-request facts as a structured reminder (not stuffed into system prompt). */
export function buildSessionContextReminder(input: SessionContextInput): string {
  const lines: string[] = [];

  if (input.budget) {
    const amount = parseBudgetAmount(input.budget);
    lines.push(
      amount
        ? `Budget: LKR ${amount.toLocaleString("en-LK")}`
        : `Budget: ${sanitizeField(input.budget, 80)}`
    );
  }
  const city = sanitizeField(input.deliveryCity, 80);
  const date = sanitizeField(input.deliveryDate, 20);
  if (city) lines.push(`City: ${city}`);
  if (date) lines.push(`Delivery date: ${date}`);
  if (input.occasion) lines.push(`Occasion: ${sanitizeField(input.occasion, 80)}`);
  if (input.recipient) lines.push(`Recipient: ${sanitizeField(input.recipient, 80)}`);

  if (input.cart.length > 0) {
    lines.push(
      `Cart: ${input.cart
        .map(
          (i) =>
            `${sanitizeField(i.product.name, 120)} ×${i.quantity} (LKR ${(i.product.price ?? 0).toLocaleString("en-LK")})`
        )
        .join("; ")}`
    );
  }

  if (input.lastProducts && input.lastProducts.length > 0) {
    lines.push(
      `Products shown: ${input.lastProducts
        .slice(0, 6)
        .map(
          (p) =>
            `${sanitizeField(p.id, 40)}:${sanitizeField(p.name, 120)} LKR ${(p.price ?? 0).toLocaleString("en-LK")}`
        )
        .join(" | ")}`
    );
    lines.push(
      "If the user asks about a shown product, answer from this data when MCP lookup returns nothing."
    );
  }

  if (lines.length === 0) return "";

  return `<system-reminder>\n# session_context\n${lines.join("\n")}\n</system-reminder>`;
}

export const COMPACT_RESUME_INSTRUCTION =
  "Continue from the context above. Do not recap or greet. Pick up the last blocking question or action.";
