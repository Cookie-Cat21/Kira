/** User explicitly rejects hand-deliver advice — use Kapruka-to-her messaging only. */
export const REPAIR_ANTI_HAND_DELIVER_RE =
  /\b(don'?t tell me to hand deliver|no hand deliver|don'?t hand deliver|not hand deliver)\b/i;

/** Kapruka-challenge style: ship to sender, they hand-deliver to partner. */
export const HAND_DELIVER_TO_HER_RE =
  /\b(hand[- ]?deliver them to her|you hand[- ]?deliver|get (?:the )?flowers to you|deliver (?:them |it )?to you.*hand[- ]?deliver)\b/i;

const PREACHY_ALWAYS_RE =
  /pick up yourself|dodging the conversation|go see her in person|go apologize in person/i;

/** Score whether reply inappropriately preaches DIY delivery over Kapruka. */
export function isPreachyHandDeliver(text: string, userMessage = ""): boolean {
  const t = (text ?? "").trim();
  const u = (userMessage ?? "").trim();
  if (!t) return false;
  if (PREACHY_ALWAYS_RE.test(t)) return true;
  if (REPAIR_ANTI_HAND_DELIVER_RE.test(u) && /\bhand[- ]?deliver\b/i.test(t)) return true;
  if (HAND_DELIVER_TO_HER_RE.test(t)) return false;
  if (/\bhand[- ]?deliver\b/i.test(t) && !/\b(to you|your (?:door|address|place))\b/i.test(t)) {
    return true;
  }
  return false;
}

export function repairIntroKeys(opts: {
  breakup: boolean;
  antiHandDeliver: boolean;
  hasProducts: boolean;
}): { intro: string; ask?: string } {
  if (opts.antiHandDeliver) {
    return { intro: "repairDirectToHerIntro" };
  }
  if (opts.breakup) {
    return opts.hasProducts
      ? { intro: "repairBreakupHandDeliverIntro" }
      : { intro: "repairBreakupHandDeliverAsk" };
  }
  return { intro: "repairGiftSearchIntro" };
}
