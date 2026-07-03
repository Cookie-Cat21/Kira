/** Kapruka shopping lane — if present, do not treat as out-of-scope. */
const KAPRUKA_LANE_RE =
  /\b(kapruka|checkout|track(?:ing)?\s+order|order\s+number|gift|flower|cake|chocolate|hamper|bouquet|deliver|send\s+(?:flowers|roses|gift|cake|chocolates)|add\s+to\s+(?:cart|tray)|ready to checkout|shop\/|\/shop\/|show me|search|catalog|reorder|order again)\b/i;

/** Non-shopping prompts — redirect with zero MCP tools. */
const OUT_OF_SCOPE_RE =
  /\b(weather|forecast|temperature|book(?:\s+me)?\s+a?\s*flight|fly to|airline|translate this|translation|cover letter|resume|cv\b|quantum physics|homework|math homework|who won (?:the )?cricket|cricket yesterday|what time is it in|time in london|need a loan|personal loan|write (?:me )?a poem|write a poem|hack (?:my|the)|instagram|usd to lkr|exchange rate|forex|currency rate|recommend (?:me )?a movie|watch a movie|feel(?:s)? so lonely|can you be my friend|find me a job|job in colombo|order me a pizza|order pizza|tell me a joke|doctor'?s appointment|medical appointment|call someone for me|best restaurant|restaurant in|explain quantum|help me with my math|mental health|therapy|suicide|self harm)\b/i;

const TRUST_OR_JAILBREAK_RE =
  /\b(is\s+kapruka|kapruka\s+legit|pretend|system prompt|different ai|jailbreak)\b/i;

export function isKaprukaShoppingLane(text: string): boolean {
  return KAPRUKA_LANE_RE.test(text);
}

export function isOutOfScopePrompt(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  if (TRUST_OR_JAILBREAK_RE.test(lower)) return false;
  if (isKaprukaShoppingLane(lower)) return false;
  return OUT_OF_SCOPE_RE.test(lower);
}

/** Common typos in messy persona queries (Group L). */
export function normalizeUserTypos(text: string): string {
  return text
    .replace(/\bflwoers\b/gi, "flowers")
    .replace(/\bbirtday\b/gi, "birthday")
    .replace(/\bcolmbo\b/gi, "colombo")
    .replace(/\btomoro\b/gi, "tomorrow")
    .replace(/\bchoclate\b/gi, "chocolate")
    .replace(/\bbouqet\b/gi, "bouquet");
}
