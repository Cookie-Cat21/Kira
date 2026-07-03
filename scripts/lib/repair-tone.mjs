/** Keep in sync with lib/kira/repair-tone.ts */

export const REPAIR_ANTI_HAND_DELIVER_RE =
  /\b(don'?t tell me to hand deliver|no hand deliver|don'?t hand deliver|not hand deliver|hand deliver karamu beda|hand deliver venam|hand deliver venam illa|hand deliver venda|hand deliver epa)\b/i;

export const HAND_DELIVER_TO_HER_RE =
  /\b(hand[- ]?deliver them to her|you hand[- ]?deliver|get (?:the )?flowers to you|deliver (?:them |it )?to you.*hand[- ]?deliver|flowers (?:oyata|ungalukku).{0,40}hand[- ]?deliver|hand[- ]?deliver karanna|hand[- ]?deliver seiyalama|ship (?:them |it )?to you)\b/i;

export const REPAIR_BREAKUP_RE =
  /\b(broke up|breakup|break up|heartbroken|dumped|break up aachu|break up wuna|break up achu)\b/i;

const PREACHY_ALWAYS_RE =
  /pick up yourself|dodging the conversation|go see her in person|go apologize in person/i;

/** Breakup + flowers without anti-hand-deliver → challenge-email hand-deliver flow. */
export function userWantsBreakupHandDeliverFlow(userMessage = "") {
  const u = (userMessage ?? "").trim();
  if (!REPAIR_BREAKUP_RE.test(u)) return false;
  if (REPAIR_ANTI_HAND_DELIVER_RE.test(u)) return false;
  return /\b(flowers?|roses?|bouquet)\b/i.test(u);
}

/** Response matches Kapruka→you→hand-deliver challenge tone (en/si/ta). */
export function hasBreakupHandDeliverTone(text = "") {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (HAND_DELIVER_TO_HER_RE.test(t)) return true;
  return /\b(aiyo|💔)\b/i.test(t) && /\b(to you|oyata|ungalukku|ship)\b/i.test(t) && /\bhand[- ]?deliver\b/i.test(t);
}

/** Score whether reply inappropriately preaches DIY delivery over Kapruka. */
export function isPreachyHandDeliver(text, userMessage = "") {
  const t = (text ?? "").trim();
  const u = (userMessage ?? "").trim();
  if (!t) return false;
  if (PREACHY_ALWAYS_RE.test(t)) return true;
  if (REPAIR_ANTI_HAND_DELIVER_RE.test(u) && /\bhand[- ]?deliver\b/i.test(t)) return true;
  if (HAND_DELIVER_TO_HER_RE.test(t)) return false;
  if (/\bhand[- ]?deliver\b/i.test(t) && !/\b(to you|your (?:door|address|place)|oyata|ungalukku)\b/i.test(t)) {
    return true;
  }
  return false;
}
