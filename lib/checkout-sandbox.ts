import type { NextRequest } from "next/server";
import type { CartItem, CheckoutInfo } from "@/types";

export function isSandboxCheckout(req?: NextRequest): boolean {
  if (process.env.KIRA_CHECKOUT_MODE === "sandbox") {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.KIRA_ALLOW_SANDBOX !== "true"
    ) {
      console.warn(
        "[checkout] KIRA_CHECKOUT_MODE=sandbox ignored in production without KIRA_ALLOW_SANDBOX=true"
      );
      return false;
    }
    return true;
  }
  return (
    process.env.NODE_ENV !== "production" &&
    req?.headers.get("x-kira-checkout-mode") === "sandbox"
  );
}

export function buildSandboxCheckoutInfo(cart: CartItem[]): CheckoutInfo {
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
