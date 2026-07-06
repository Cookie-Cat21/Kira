/**
 * Zero-MCP, zero-Groq handlers — must run before getMcpClient() in the chat route.
 * Target: greetings, policy answers, cart read, vague clarifiers in <200ms.
 */
import { isOutOfScopePrompt } from "@/lib/kira/out-of-scope";
import { L, Lf } from "@/lib/kira/localization";
import { sse, streamInstant } from "@/lib/kira/sse";
import {
  extractCityHint,
  extractOrderNumber,
  extractProductKeyword,
} from "@/lib/kira/search";
import type { CartItem, KiraProduct } from "@/types";

const FILLER_TAIL =
  /(?:\s+(?:please|thanks|thank you|lah|machang|bro|go|[🎁💐🎂🌹])*)*[!?.…]*$/i;

/** Bare hi / hey / hello — no product intent. */
export const BARE_GREETING_RE =
  /^(?:good\s+(?:morning|afternoon|evening)|hi|hey|hello|howdy|yo|sup|hiya|heya|ayubowan|ayyo)(?:[!?.…,\s]*(?:there|kira|machang|bro|lah|please))?[!?.…]*$/i;

export const HELP_ONLY_RE = /^help(?:[!?.…]+)?$/i;

const EMOJI_ONLY_RE = /^[\p{Extended_Pictographic}\s]{1,40}$/u;

/** Group V — zero context; must ask, never Groq loop. */
export const VAGUE_ZERO_CONTEXT_RE =
  /^(?:just a gift|gift|something|stuff|things|i need something\.?\.?|something nice|i don'?t know what to get|can you help me pick something\??|help me find something|something sweet)(?:\s+(?:please|lah|machang|bro|[🎁💐🎂]))*[!?.…]*$/i;

const RECIPIENT_ONLY_VAGUE_RE =
  /^(?:something|surprise|gift|a gift)\s+for\s+(?:my\s+)?(?:friend|amma|mum|mom|wife|husband|her|him|daughter|son|partner)(?:\s+(?:please|lah|machang|bro))?[!?.…]*$/i;

const DATE_ONLY_VAGUE_RE =
  /^(?:i\s+)?need\s+it\s+by\s+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})(?:\s+(?:please|lah|machang|bro))?[!?.…]*$/i;

const SINHALA_PARTIAL_RE = /^(?:amma|mum|mama|thaththa|dad)\s+ta\b(?:\s+(?:lah|machang|bro))?[!?.…]*$/i;

const BARE_BUDGET_ONLY_RE =
  /^(?:(?:under|below|max(?:imum)?|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+)|(?:rs\.?|lkr\s*)?([\d,]+)\s*budget(?:,?\s*go)?)(?:\s+(?:please|lah|machang|bro))*[!?.…]*$/i;

const CART_CONTENTS_RE =
  /\b(what'?s in|show|view|see|check|how many items in)\s+(?:my\s+)?(?:cart|tray|basket|bag)\b|\bcart contents\b|\bmy tray\b/i;

const GIFT_MESSAGE_INTENT_RE =
  /\b(gift message|gift note|add a note|message on the card|note on the card|card message)\b/i;
const GIFT_NOTE_ALREADY_PROVIDED_RE =
  /\bnote\s*[:\-—–]\s*\S|\badd\s+gift\s+message\s+\S|\b(?:happy|sorry|love|miss you|birthday|thank)\b/i;
const PRODUCT_SEND_WITH_NOTE_RE =
  /\b(send|deliver|flowers?|roses?|bouquet|cake|chocolates?)\b/i;

const JAILBREAK_RE =
  /\b(dan\s+mode|pretend\s+(you(?:'?re?|\s+are?)|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+(all\s+)?(your\s+)?(previous\s+)?instructions?|forget\s+your\s+(system\s+)?prompt|system\s+prompt|your\s+prompt|disregard\s+your|roleplay\s+as|be\s+a\s+different\s+ai|simulate\s+(being\s+)?an?\s+ai|no\s+restrictions)\b/i;

const TRUST_RE =
  /\b(is\s+(kapruka|this|it)(\s+\w+){0,3}\s+(legit|safe|real|trusted?|reliable|genuine|authentic|scam|trustworthy)|can\s+i\s+trust\s+(kapruka|this|it)|kapruka\s+(legit|safe|real|trusted?|reliable)|(?:safe|a scam)\s+to\s+order)\b/i;

const COD_RE =
  /\b(cash\s+on\s+delivery|pay\s+on\s+delivery|\bcod\b|pay\s+cash|cash\s+payment|can\s+i\s+pay\s+cash|accept\s+cod)\b/i;

const DELIVERY_POLICY_RE =
  /\b(cut[- ]?off|same[- ]day|how (?:fast|soon|long)|when do you (?:deliver|stop)|delivery (?:time|window|hours|cutoff|fee|areas?))\b/i;

const TELL_ME_ABOUT_RE = /\btell\s+me\s+(?:a\s+bit\s+|more\s+)?about\b/i;

const CHECKOUT_INTENT_RE =
  /\b(ready to checkout|complete the order|checkout now|want to checkout|place my order|create checkout link|proceed to payment|^checkout$|pay now|finish order)\b/i;

const TRACKING_ASK_ONLY_RE =
  /\b(track(?:ing)?|where(?:'s| is)\s+my\s+order|order\s+status)\b/i;

function assistantAlreadySpoke(messages: { role: string; content: string }[]): boolean {
  return messages.some((m) => m.role === "assistant" && m.content.trim().length > 0);
}

function isVagueClarifier(text: string, _lower: string): boolean {
  if (EMOJI_ONLY_RE.test(text)) return true;
  if (VAGUE_ZERO_CONTEXT_RE.test(text)) return true;
  if (RECIPIENT_ONLY_VAGUE_RE.test(text)) return true;
  if (DATE_ONLY_VAGUE_RE.test(text)) return true;
  if (SINHALA_PARTIAL_RE.test(text)) return true;
  return false;
}

function replyInstant(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string
) {
  streamInstant(controller, text);
  controller.enqueue(sse("done"));
}

export async function tryHandleInstantPrompt({
  text,
  messages,
  cart,
  language,
  controller,
  lastProducts,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  language: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastProducts?: KiraProduct[];
}): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    replyInstant(controller, L("emptyGreeting", language));
    return true;
  }

  if (BARE_GREETING_RE.test(trimmed) || HELP_ONLY_RE.test(trimmed)) {
    const key = assistantAlreadySpoke(messages) ? "greetingFollowUp" : "greetingQuick";
    replyInstant(controller, L(key, language));
    return true;
  }

  if (isVagueClarifier(trimmed, lower)) {
    replyInstant(controller, L("vagueAsk", language));
    return true;
  }

  const bareBudget = BARE_BUDGET_ONLY_RE.exec(trimmed);
  if (bareBudget) {
    const raw = bareBudget[1] ?? bareBudget[2];
    const amount = Number(raw?.replace(/,/g, "") ?? 0);
    if (amount >= 100 && amount <= 500_000) {
      replyInstant(controller, L("budgetOnlyAsk", language));
      return true;
    }
  }

  if (CART_CONTENTS_RE.test(lower)) {
    if (cart.length === 0) {
      replyInstant(controller, L("checkoutEmptyCart", language));
    } else {
      const lines = cart
        .map(
          (i, idx) =>
            `${idx + 1}. **${i.product.name}** ×${i.quantity} — LKR ${(i.product.price * i.quantity).toLocaleString("en-LK")}`
        )
        .join("\n");
      const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      replyInstant(
        controller,
        `Your tray:\n\n${lines}\n\nSubtotal: **LKR ${total.toLocaleString("en-LK")}**`
      );
    }
    return true;
  }

  if (
    cart.length > 0 &&
    GIFT_MESSAGE_INTENT_RE.test(lower) &&
    !GIFT_NOTE_ALREADY_PROVIDED_RE.test(lower) &&
    !PRODUCT_SEND_WITH_NOTE_RE.test(lower) &&
    !extractProductKeyword(lower)
  ) {
    replyInstant(controller, L("giftMessageAsk", language));
    return true;
  }

  if (JAILBREAK_RE.test(lower)) {
    replyInstant(controller, L("jailbreakRedirect", language));
    return true;
  }

  if (
    TRUST_RE.test(lower) &&
    !extractProductKeyword(lower) &&
    !/\b(order|deliver|send|buy|flowers?|cake|gift)\b/i.test(lower)
  ) {
    replyInstant(controller, L("trustAffirmation", language));
    return true;
  }

  if (isOutOfScopePrompt(trimmed)) {
    replyInstant(controller, L("outOfScopeRedirect", language));
    return true;
  }

  if (
    COD_RE.test(lower) &&
    !extractProductKeyword(lower) &&
    !extractCityHint(trimmed)
  ) {
    replyInstant(controller, L("codPolicy", language));
    return true;
  }

  if (
    DELIVERY_POLICY_RE.test(lower) &&
    !extractProductKeyword(lower) &&
    !extractCityHint(trimmed)
  ) {
    replyInstant(controller, L("deliveryPolicy", language));
    return true;
  }

  if (TELL_ME_ABOUT_RE.test(lower) && lastProducts?.length === 1) {
    const target = lastProducts[0];
    const namedTarget = target.name && lower.includes(target.name.toLowerCase());
    const pronounTarget = /\b(it|this|that|the\s+one)\b/i.test(lower);
    if (namedTarget || pronounTarget) {
      let summary = (target.summary ?? "").replace(/\s+/g, " ").trim();
      if (summary && !/[.!?]$/.test(summary)) summary += ".";
      replyInstant(
        controller,
        Lf(
          target.inStock === false ? "aboutProductOutOfStock" : "aboutProductInStock",
          language,
          {
            name: target.name,
            price: `LKR ${target.price.toLocaleString("en-LK")}`,
            category: target.category ? ` (${target.category})` : "",
            summary: summary ? ` ${summary}` : "",
          }
        )
      );
      return true;
    }
  }

  if (
    CHECKOUT_INTENT_RE.test(lower) &&
    !extractProductKeyword(lower) &&
    !extractCityHint(trimmed)
  ) {
    replyInstant(
      controller,
      cart.length === 0 ? L("checkoutEmptyCart", language) : L("checkoutNeedName", language)
    );
    return true;
  }

  if (TRACKING_ASK_ONLY_RE.test(lower) && !extractOrderNumber(trimmed)) {
    replyInstant(controller, L("trackingAskOrderNumber", language));
    return true;
  }

  return false;
}
