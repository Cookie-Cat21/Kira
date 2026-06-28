import Groq from "groq-sdk";
import type { CartItem, KiraProduct } from "@/types";
import { SERVER_CITY_REGEX } from "@/lib/kira/search";

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "llama-3.3-70b-versatile": 128_000,
  "meta-llama/llama-4-scout-17b-16e-instruct": 131_000,
  "llama-3.1-8b-instant": 128_000,
};
export const OUTPUT_TOKEN_RESERVE = 1_500;
export const TRIM_TRIGGER_PCT = 0.75;
export const TRIM_TARGET_PCT = 0.60;

export function trimContextIfNeeded(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  promptTokens: number,
  model: string
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const effective = (MODEL_CONTEXT_LIMITS[model] ?? 128_000) - OUTPUT_TOKEN_RESERVE;
  if (promptTokens < effective * TRIM_TRIGGER_PCT) return messages;

  const system = messages[0];
  const rest = messages.slice(1);
  if (rest.length <= 2) return messages;

  const avgTokensPerMessage = promptTokens / messages.length;
  const targetTokens = effective * TRIM_TARGET_PCT;
  const toDrop = Math.min(
    Math.ceil((promptTokens - targetTokens) / avgTokensPerMessage),
    rest.length - 2
  );

  if (toDrop <= 0) return messages;
  console.log(
    `[Kira] context trim: ${promptTokens}/${effective} tokens — dropping ${toDrop} messages`
  );
  return [system, ...rest.slice(toDrop)];
}

export type CompactSummaryState = {
  budget?: string;
  occasion?: string;
  recipient?: string;
  deliveryCity?: string;
  deliveryDate?: string;
  cart?: CartItem[];
  lastProducts?: KiraProduct[];
};

export function buildCompactSummary(
  messages: { role: string; content: string }[],
  state: CompactSummaryState = {}
): string {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (f: string) => {
    if (!seen.has(f)) {
      seen.add(f);
      facts.push(`• ${f}`);
    }
  };

  if (state.budget) push(`Budget: ${state.budget}`);
  if (state.deliveryCity) push(`City: ${state.deliveryCity}`);
  if (state.deliveryDate) push(`Delivery date: ${state.deliveryDate}`);
  if (state.occasion) push(`Occasion: ${state.occasion}`);
  if (state.recipient) push(`Recipient: ${state.recipient}`);

  if (state.cart && state.cart.length > 0) {
    push(
      `Cart: ${state.cart.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}`
    );
  }

  if (state.lastProducts && state.lastProducts.length > 0) {
    push(
      `Products shown: ${state.lastProducts
        .slice(0, 6)
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  for (const msg of messages) {
    const t = typeof msg.content === "string" ? msg.content : "";
    const lo = t.toLowerCase();

    if (msg.role === "user") {
      const budget = t.match(
        /\b(?:under|below|max(?:imum)?|budget)[:\s]+(?:lkr\s*)?([\d,]+)/i
      );
      if (budget) push(`Budget ceiling: LKR ${budget[1].replace(/,/g, "")}`);

      const city = t.match(SERVER_CITY_REGEX);
      if (city) push(`Delivery city mentioned: ${city[1]}`);

      const occ = t.match(
        /\b(birthday|wedding|anniversary|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|new\s+year)\b/i
      );
      if (occ) push(`Occasion: ${occ[1]}`);

      const rec = t.match(
        /\bfor\s+(?:my\s+)?(mum|mom|amma|dad|father|mother|wife|husband|friend|sister|brother|daughter|son|boss|colleague)\b/i
      );
      if (rec) push(`Recipient: ${rec[1]}`);

      if (/\b(no thanks|not interested|skip|don't want)\b/i.test(lo)) {
        push("User declined an upsell or extra");
      }
      if (/\b(angry|mad|pissed|messed up|fight|upset)\b/i.test(lo)) {
        push("Emotional context: relationship repair scenario");
      }
    }

    if (msg.role === "assistant") {
      if (/\d+\s+picks?|showing\s+\d+|here\s+are\s+\d+/i.test(lo))
        push("Products were shown from Kapruka search");
      if (/delivery\s+(?:to\s+\w+\s+)?(?:is\s+)?lkr\s*[\d,]+/i.test(lo))
        push("Delivery fee was confirmed");
      if (/order\s+(?:has\s+been\s+)?placed|checkout\s+link/i.test(lo))
        push("An order was placed or a checkout link was shared");
      if (/gift message|here'?s your note/i.test(lo))
        push("Gift message was read back");
    }
  }

  if (facts.length === 0) return "";
  return `[Earlier conversation summary]\n${facts.join("\n")}`;
}
