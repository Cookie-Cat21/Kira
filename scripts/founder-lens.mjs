/**
 * founder-lens.mjs
 * Heuristic "founder lens" scoring for friend-delivery / emotional-repair replies.
 *
 * Usage:
 *   import { scoreFounderLens } from "./founder-lens.mjs";
 */

const FRIENDLY_RE =
  /machang|oof|rough|no judgment|sweet|bro\b|aiyo|that's rough|sorry you're going through|no worries/i;
const DELIVERY_RE =
  /\bdeliver|send to|send\b|door|address|kapruka|ship|get it to her|get it to him|send her|send him/i;
import { isPreachyHandDeliver } from "./lib/repair-tone.mjs";
const FLOWER_PRODUCT_RE = /flowers?|roses?|chocolates?|bouquet|hamper/i;

function lastUserText(persona) {
  if (persona?.msg) return persona.msg;
  const msgs = persona?.request?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "user" && typeof msgs[i].content === "string") return msgs[i].content;
  }
  return "";
}

function hasProducts(events) {
  return (events ?? []).some(
    (e) => e.t === "products" && Array.isArray(e.v) && e.v.length > 0
  );
}

function wantsProducts(persona) {
  if (persona?.expectProducts === true) return true;
  if (persona?.expectProducts === false) return false;
  const checks = persona?.checks ?? [];
  if (checks.some((c) => (Array.isArray(c) ? c[0] : c) === "products")) return true;
  const userText = lastUserText(persona);
  if (
    /\bcan (?:you|kapruka|i)\b/i.test(userText) &&
    /\b(deliver|send)\b/i.test(userText) &&
    !/\b(order|send (?:me|her|him|roses|flowers)|need to send)\b/i.test(userText)
  ) {
    return false;
  }
  return FLOWER_PRODUCT_RE.test(userText) || /\bsend .+ to\b/i.test(userText);
}

/**
 * @param {string} responseText
 * @param {Array<{ t: string, v?: unknown }>} events
 * @param {{ msg?: string, request?: { messages?: Array<{ role: string, content: string }> }, expectProducts?: boolean }} persona
 * @returns {{ score: number, flags: string[], pass: boolean }}
 */
export function scoreFounderLens(responseText, events, persona = {}) {
  const text = (responseText ?? "").trim();
  const flags = [];
  let score = 0;

  if (isPreachyHandDeliver(text, lastUserText(persona))) {
    flags.push("preachy_hand_deliver");
    return { score: 0, flags, pass: false };
  }

  if (FRIENDLY_RE.test(text)) {
    flags.push("friendly_tone");
    score += 2.5;
  } else {
    flags.push("missing_friendly_tone");
  }

  if (DELIVERY_RE.test(text)) {
    flags.push("offers_delivery");
    score += 2.5;
  } else {
    flags.push("missing_delivery_offer");
  }

  const needProducts = wantsProducts(persona);
  if (needProducts) {
    if (hasProducts(events)) {
      flags.push("showed_products");
      score += 5;
    } else {
      flags.push("missing_products");
    }
  } else {
    flags.push("no_product_required");
    score += 5;
  }

  const rounded = Math.round(Math.min(10, Math.max(0, score)));
  const pass =
    !flags.includes("preachy_hand_deliver") &&
    rounded >= 7 &&
    !flags.includes("missing_products");

  return { score: rounded, flags, pass };
}
