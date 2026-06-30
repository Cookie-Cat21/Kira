/**
 * ceo-lens.mjs — Dulith-inspired heuristic review per persona response.
 * Maps the founder evaluator skill to automated checks per persona group.
 */

const KAPRUKA_RE = /kapruka|gift|shop|browse|catalog|order|deliver/i;
const WARM_RE =
  /machang|oof|sweet|lovely|happy to|can i help|what kind|tell me|who'?s it for|budget|occasion|\?|🎁|ha,|sorry|no worries|ayubowan|வணக்கம்|ආයුබෝවන්|pulled live|tap a card|tray|checkout link|secure checkout/i;
const CORPORATE_RE = /as an ai|i am a language model|i cannot assist with that request/i;
const PREACHY_RE =
  /hand[- ]?deliver|pick up yourself|dodging the conversation|go see her in person/i;
const LEAK_RE =
  /you are kira|core flow|sinhala mirroring|tryHandleDeterministic|tryhandleDeterministic/i;
const TOOL_MARKUP_RE = /<function=|kapruka_\w+>\s*\{|"\s*in_stock_only\s*":/i;
const GENERIC_CAROUSEL_RE =
  /^here are \d+ picks\b|^here are kapruka'?s top picks right now/i;

function hasFamilyUnsafeProduct(events) {
  const products = (events ?? []).find((e) => e.t === "products")?.v;
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.some((p) =>
    /\b(condom|condoms|contraceptive|lubricant|sex\s*toy|adult\s*toy|vibrat|dildo|lingerie|intimate\s*wear|bondage|fetish|erotic|viagra|cialis|cigarette|tobacco|nicotine|vape|whisky|whiskey|vodka|wine\b|beer\b|champagne|liquor|arrack)\b/i.test(
      `${p.name ?? ""} ${p.category ?? ""}`
    )
  );
}

function hasProducts(events) {
  return (events ?? []).some(
    (e) => e.t === "products" && Array.isArray(e.v) && e.v.length > 0
  );
}

function toolCount(events) {
  return (events ?? []).filter((e) => e.t === "step").length;
}

function userMessage(persona) {
  if (persona?.msg) return persona.msg;
  const msgs = persona?.request?.messages;
  if (!Array.isArray(msgs)) return "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "user") return msgs[i].content ?? "";
  }
  return "";
}

/**
 * @returns {{ score: number, excitement: number, flags: string[], pass: boolean, verdict: string }}
 */
export function scoreCeoLens(group, persona, responseText, events, personaPassed) {
  const text = (responseText ?? "").trim();
  const flags = [];
  let score = 5;
  let excitement = 5;
  const msg = userMessage(persona);

  if (!text) {
    return { score: 0, excitement: 0, flags: ["empty_response"], pass: false, verdict: "No response — dead end." };
  }
  if (PREACHY_RE.test(text)) {
    return { score: 0, excitement: 0, flags: ["preachy_hand_deliver"], pass: false, verdict: "Wrong advice — Kapruka exists to deliver." };
  }
  if (CORPORATE_RE.test(text)) {
    flags.push("corporate_robot");
    score -= 4;
    excitement -= 4;
  }
  if (LEAK_RE.test(text)) {
    flags.push("prompt_leak");
    score = 0;
    excitement = 0;
    return { score, excitement, flags, pass: false, verdict: "Leaked internals — trust killer." };
  }
  if (TOOL_MARKUP_RE.test(text)) {
    flags.push("tool_markup_leak");
    return {
      score: 0,
      excitement: 0,
      flags,
      pass: false,
      verdict: "Tool markup leaked into user-visible reply.",
    };
  }
  if (GENERIC_CAROUSEL_RE.test(text) && hasProducts(events)) {
    flags.push("generic_carousel_copy");
    score -= 2;
    excitement -= 3;
  }
  if (hasFamilyUnsafeProduct(events)) {
    flags.push("family_unsafe_carousel");
    return {
      score: 0,
      excitement: 0,
      flags,
      pass: false,
      verdict: "Family-unsafe item in carousel — trust killer for kids/families.",
    };
  }

  switch (group) {
    case "A": {
      if (WARM_RE.test(text)) { flags.push("warm_approachable"); score += 2; excitement += 1; }
      else { flags.push("cold_or_flat"); score -= 2; }
      if (persona.expect === "ask" && hasProducts(events)) {
        flags.push("premature_products"); score -= 3; excitement -= 2;
      }
      if (/nothing in stock|couldn'?t find|no results/i.test(text)) {
        flags.push("nothing_found_on_vague"); score -= 3;
      }
      if (persona.expect === "search" && hasProducts(events)) {
        flags.push("useful_browse"); score += 2; excitement += 2;
      }
      if (personaPassed) { excitement += 2; }
      break;
    }
    case "B": {
      if (personaPassed) { flags.push("stayed_in_lane"); score += 3; excitement += 4; }
      else if (toolCount(events) > 0) { flags.push("unnecessary_tools"); score -= 3; excitement -= 2; }
      if (KAPRUKA_RE.test(text)) { flags.push("warm_redirect"); score += 1; excitement += 1; }
      if (text.length <= 220) { flags.push("concise"); score += 1; }
      break;
    }
    case "C": {
      if (hasProducts(events)) { flags.push("real_catalog"); score += 2; excitement += 2; }
      if (events?.some((e) => e.t === "delivery")) { flags.push("delivery_aware"); score += 1; excitement += 1; }
      if (/LKR\s*[\d,]+/i.test(text) && !hasProducts(events)) {
        flags.push("possible_hallucination"); score -= 4; excitement -= 3;
      }
      if (WARM_RE.test(text)) { flags.push("human_checkout_tone"); score += 1; excitement += 1; }
      if (personaPassed) { excitement += 2; }
      break;
    }
    case "D": {
      flags.push("language_gating");
      if (personaPassed) { score += 3; excitement += 3; }
      else { score -= 3; excitement -= 2; }
      break;
    }
    case "E": {
      if (toolCount(events) === 0) { flags.push("stayed_in_lane"); score += 2; excitement += 1; }
      if (/kira/i.test(text)) { flags.push("in_character"); score += 1; excitement += 1; }
      if (personaPassed) { score += 2; excitement += 2; }
      else { score -= 3; }
      break;
    }
    case "F": {
      if (personaPassed) { flags.push("judge_path_solid"); score += 3; excitement += 3; }
      else { score -= 3; excitement -= 2; }
      if (WARM_RE.test(text) || KAPRUKA_RE.test(text)) {
        flags.push("polished"); score += 1; excitement += 1;
      }
      if (hasProducts(events)) { flags.push("f_catalog"); excitement += 1; }
      if (toolCount(events) === 0 && /\bcash\b|\bcod\b|payment|pay\b/i.test(msg)) {
        flags.push("policy_no_tools"); score += 1; excitement += 2;
      }
      break;
    }
    case "G": {
      if (WARM_RE.test(text)) { flags.push("friend_tone"); score += 2; }
      if (/deliver|send/i.test(text)) { flags.push("delivery_help"); score += 2; }
      if (hasProducts(events) && /flowers?|roses?|send|order/i.test(msg)) {
        flags.push("sends_to_her"); score += 2; excitement += 2;
      }
      break;
    }
    case "H": {
      if (personaPassed && hasProducts(events)) {
        flags.push("storefront_catalog"); score += 2; excitement += 3;
      } else if (personaPassed) {
        flags.push("storefront_honest"); score += 1; excitement += 1;
      } else {
        score -= 2; excitement -= 2;
      }
      if (WARM_RE.test(text)) { flags.push("warm_storefront"); excitement += 1; }
      break;
    }
    case "I": {
      if (personaPassed) { flags.push("multilingual_ok"); score += 2; excitement += 2; }
      else { score -= 2; excitement -= 2; }
      if (WARM_RE.test(text)) excitement += 1;
      break;
    }
    case "J": {
      if (personaPassed) { flags.push("checkout_path"); score += 2; excitement += 3; }
      else { score -= 2; excitement -= 2; }
      if (WARM_RE.test(text) || KAPRUKA_RE.test(text)) { excitement += 2; }
      break;
    }
    case "K": {
      if (personaPassed) { flags.push("reorder_path"); score += 2; excitement += 3; }
      else { score -= 2; excitement -= 2; }
      if (hasProducts(events)) excitement += 2;
      if (WARM_RE.test(text) || KAPRUKA_RE.test(text)) excitement += 1;
      break;
    }
    case "L": {
      if (personaPassed) { score += 2; excitement += 2; }
      else { score -= 2; excitement -= 1; }
      if (hasProducts(events)) excitement += 1;
      break;
    }
    case "M": {
      if (personaPassed && hasProducts(events)) {
        flags.push("ceo_gold_catalog"); score += 3; excitement += 3;
      } else if (personaPassed) {
        flags.push("ceo_gold_handled"); score += 2; excitement += 2;
      } else {
        score -= 3; excitement -= 2;
      }
      if (WARM_RE.test(text)) excitement += 1;
      if (/machang|roses|deliver|send/i.test(text)) excitement += 1;
      break;
    }
    default:
      break;
  }

  if (personaPassed && hasProducts(events) && WARM_RE.test(text)) {
    flags.push("warm_product_moment");
    excitement += 1;
    score += 1;
  }

  if (personaPassed) { flags.push("persona_checks_passed"); score += 1; }
  else { flags.push("persona_checks_failed"); score -= 2; }

  const rounded = Math.round(Math.min(10, Math.max(0, score)));
  const exc = Math.round(Math.min(10, Math.max(0, excitement)));
  const pass = rounded >= 7 && !flags.includes("prompt_leak") && !flags.includes("preachy_hand_deliver");

  const verdict = pass
    ? exc >= 8
      ? "Founder would notice — useful and shippable."
      : "Acceptable — works but not memorable."
    : flags.includes("premature_products")
    ? "Too eager to sell before understanding the user."
    : flags.includes("nothing_found_on_vague")
    ? "Feels broken — should ask, not give up."
    : flags.includes("unnecessary_tools")
    ? "Wasted MCP calls on out-of-scope chat."
    : "Needs fix before a founder demo.";

  return { score: rounded, excitement: exc, flags, pass, verdict };
}

/** Map 0–10 CEO lens to 0–100 for pass gates (target ≥90). */
export function ceoScorePercent(ceoLens) {
  if (!ceoLens) return 0;
  const base = ceoLens.excitement ?? ceoLens.score ?? 0;
  let pct = Math.round(base * 10);
  if (ceoLens.flags?.includes("generic_carousel_copy")) pct = Math.min(pct, 79);
  if (ceoLens.flags?.includes("tool_markup_leak") || ceoLens.flags?.includes("family_unsafe_carousel")) {
    pct = 0;
  }
  return Math.max(0, Math.min(100, pct));
}

export function ceoPassAt90(ceoLens) {
  return ceoScorePercent(ceoLens) >= 90 && ceoLens?.pass !== false;
}
