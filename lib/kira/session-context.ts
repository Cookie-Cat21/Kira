import type { CartItem, KiraProduct } from "@/types";
import { parseBudgetAmount } from "@/lib/kira/catalog-guard";

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
        : `Budget: ${input.budget}`
    );
  }
  if (input.deliveryCity) lines.push(`City: ${input.deliveryCity}`);
  if (input.deliveryDate) lines.push(`Delivery date: ${input.deliveryDate}`);
  if (input.occasion) lines.push(`Occasion: ${input.occasion}`);
  if (input.recipient) lines.push(`Recipient: ${input.recipient}`);

  if (input.cart.length > 0) {
    lines.push(
      `Cart: ${input.cart
        .map((i) => `${i.product.name} ×${i.quantity} (LKR ${i.product.price.toLocaleString("en-LK")})`)
        .join("; ")}`
    );
  }

  if (input.lastProducts && input.lastProducts.length > 0) {
    lines.push(
      `Products shown: ${input.lastProducts
        .slice(0, 6)
        .map((p) => `${p.id}:${p.name} LKR ${p.price.toLocaleString("en-LK")}`)
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
