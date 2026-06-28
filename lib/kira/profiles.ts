export type KiraProfile = {
  id: string;
  whenToUse: string;
  toolRules: string;
  allowedTools: string[] | "*";
};

export const KIRA_PROFILES: KiraProfile[] = [
  {
    id: "gift-finder",
    whenToUse: "User has gift intent with budget, occasion, or city",
    toolRules:
      "Search with concrete categories (flowers, chocolate, cake, hamper). Check delivery when city + product are known.",
    allowedTools: [
      "kapruka_search_products",
      "kapruka_list_categories",
      "kapruka_check_delivery",
      "kapruka_list_delivery_cities",
      "kapruka_get_product",
    ],
  },
  {
    id: "checkout",
    whenToUse: "User is ready to checkout or placing an order",
    toolRules:
      "Collect missing fields one at a time. Confirm total before kapruka_create_order.",
    allowedTools: [
      "kapruka_get_product",
      "kapruka_check_delivery",
      "kapruka_list_delivery_cities",
      "kapruka_create_order",
    ],
  },
  {
    id: "tracking",
    whenToUse: "User asks about order status or provides an order number",
    toolRules: "Only describe status from kapruka_track_order results.",
    allowedTools: ["kapruka_track_order"],
  },
];

export function detectProfile(text: string, cartItemCount: number): KiraProfile | null {
  const lower = text.toLowerCase();

  if (
    /\b(track|tracking|status|where(?:'s| is)|locate)\b/i.test(lower) &&
    /\b(order|delivery|package|parcel|shipment)\b/i.test(lower)
  ) {
    return KIRA_PROFILES.find((p) => p.id === "tracking") ?? null;
  }

  if (
    cartItemCount > 0 &&
    (/\b(checkout|place\s+(the\s+)?order|ready to pay|pay now)\b/i.test(lower) ||
      /\b(recipient|delivery address|phone number|gift message)\b/i.test(lower))
  ) {
    return KIRA_PROFILES.find((p) => p.id === "checkout") ?? null;
  }

  const hasGiftSignal =
    /\b(gift|present|birthday|anniversary|father'?s\s+day|mother'?s\s+day)\b/i.test(
      lower
    );
  const hasConcreteSignal =
    /\b(?:under|below|max|budget|lkr\s*\d)\b/i.test(lower) ||
    /\b(colombo|kandy|galle|negombo|jaffna)\b/i.test(lower) ||
    /\b(cake|flower|chocolate|hamper|roses)\b/i.test(lower);

  if (hasGiftSignal && hasConcreteSignal) {
    return KIRA_PROFILES.find((p) => p.id === "gift-finder") ?? null;
  }

  return null;
}

export function buildProfilePrompt(profile: KiraProfile): string {
  return `\n\n[ACTIVE PROFILE: ${profile.id}]\n${profile.toolRules}`;
}
