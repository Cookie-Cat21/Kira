import type { CommerceContext } from "@/app/components/CommerceRail";

const CITY_RE =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

const BUDGET_RE =
  /(?:under|below|max|budget|rs\.?|lkr|rupees?)\s*([\d,]+(?:\.\d+)?)\s*(?:k|000)?/i;

const OCCASION_RE =
  /\b(birthday|anniversary|wedding|valentine|mother'?s?\s*day|father'?s?\s*day|get[- ]?well|congratulations|new\s*baby|graduation)\b/i;

const RECIPIENT_RE =
  /\b(?:for\s+)?(?:my\s+)?(girlfriend|boyfriend|wife|husband|mother|father|mom|dad|amma|thaththa|nangi|malli|akka|ayya|friend|boss|colleague|partner)\b/i;

const TOMORROW_RE = /\b(tomorrow|today|next\s+week)\b/i;

function formatBudget(amount: number): string {
  if (amount >= 1000) {
    return `Under Rs. ${amount.toLocaleString("en-LK")}`;
  }
  return `Under Rs. ${amount}`;
}

function parseBudget(text: string): string | undefined {
  const match = text.match(BUDGET_RE);
  if (!match) return undefined;
  const raw = match[1].replace(/,/g, "");
  let amount = parseFloat(raw);
  if (Number.isNaN(amount)) return undefined;
  if (/k\b/i.test(text) && amount < 1000) amount *= 1000;
  if (amount < 100) amount *= 1000;
  return formatBudget(amount);
}

function parseOccasion(text: string): string | undefined {
  const match = text.match(OCCASION_RE);
  if (!match) return undefined;
  return match[1].replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function parseRecipient(text: string): string | undefined {
  const match = text.match(RECIPIENT_RE);
  if (!match) return undefined;
  const label = match[1].toLowerCase();
  const map: Record<string, string> = {
    amma: "Amma",
    thaththa: "Thaththa",
    nangi: "Nangi",
    malli: "Malli",
    akka: "Akka",
    ayya: "Ayya",
    mom: "Mom",
    dad: "Dad",
  };
  return map[label] ?? label.charAt(0).toUpperCase() + label.slice(1);
}

function parseCity(text: string): string | undefined {
  const match = text.match(CITY_RE);
  if (!match) return undefined;
  return match[1]
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseDeliveryDate(text: string): string | undefined {
  if (!TOMORROW_RE.test(text)) return undefined;
  const d = new Date();
  if (/\btomorrow\b/i.test(text)) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Merge commerce context from all user messages (latest wins per field). */
export function extractCommerceContext(
  userMessages: string[],
  overrides: Partial<CommerceContext> = {}
): CommerceContext {
  const merged: CommerceContext = { ...overrides };

  for (const text of userMessages) {
    const city = parseCity(text);
    if (city) merged.city = city;

    const budget = parseBudget(text);
    if (budget) merged.budget = budget;

    const occasion = parseOccasion(text);
    if (occasion) merged.occasion = occasion;

    const recipient = parseRecipient(text);
    if (recipient) merged.recipient = recipient;

    const deliveryDate = parseDeliveryDate(text);
    if (deliveryDate) merged.deliveryDate = deliveryDate;
  }

  return merged;
}
