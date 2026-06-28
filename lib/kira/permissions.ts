const READ_ONLY_TOOLS = new Set([
  "kapruka_search_products",
  "kapruka_list_categories",
  "kapruka_check_delivery",
  "kapruka_get_product",
  "kapruka_list_delivery_cities",
  "kapruka_track_order",
]);

const CHECKOUT_CONFIRM_RE =
  /\b(yes|yeah|yep|sure|ok|okay|go ahead|place it|confirm|proceed|do it|sounds good)\b/i;

export type McpPermissionContext = {
  checkoutConfirmed?: boolean;
  hasCompleteCheckoutFields?: boolean;
};

export function canInvokeMcpTool(
  toolName: string,
  _args: Record<string, unknown>,
  ctx: McpPermissionContext = {}
): { allowed: true } | { allowed: false; reason: string } {
  if (toolName !== "kapruka_create_order") return { allowed: true };

  if (ctx.checkoutConfirmed) return { allowed: true };
  if (ctx.hasCompleteCheckoutFields) return { allowed: true };

  return {
    allowed: false,
    reason:
      "Checkout not confirmed — confirm the total with the user before placing the order.",
  };
}

export function isCheckoutConfirmation(text: string): boolean {
  return CHECKOUT_CONFIRM_RE.test(text.trim());
}

export { READ_ONLY_TOOLS };
