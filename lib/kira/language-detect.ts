/** Script-aware language detection for API + client (Group Z contract). */

const SI_SCRIPT_RE = /[඀-෿]/;
const TA_SCRIPT_RE = /[஀-௿]/;

const SINGLISH_MARKERS_RE =
  /\b(machang|mata|matta|onna|one|karanna|karamu|oyata|eyata|den|mokak|kohomada|hari|bro|aiyo|kapruka|colombo|kopa|wena|ganna|yawan|deliver karanna)\b/i;

const TANGLISH_MARKERS_RE =
  /\b(venum|venda|pannunga|pannalam|eng(a|al)|naan|unga|avanga|machan|seri|itho|anuppa|deliver pann|colombo|kova|sapadu|gift venum)\b/i;

export type LanguageMode = "en" | "si" | "ta";

/** Map user text + optional UI hint to API language param. */
export function detectApiLanguage(userText: string, uiLang: LanguageMode = "en"): LanguageMode {
  const t = (userText ?? "").trim();
  if (SI_SCRIPT_RE.test(t)) return "si";
  if (TA_SCRIPT_RE.test(t)) return "ta";
  if (uiLang === "si" || uiLang === "ta") return uiLang;
  return "en";
}

/** Full five-mode classification (matches scripts/lib/language-mode.mjs). */
export function detectLanguageMode(
  userText: string,
  apiLang: LanguageMode = "en"
): "en" | "si" | "ta" | "singlish" | "tanglish" {
  const t = (userText ?? "").trim();
  if (SI_SCRIPT_RE.test(t)) return "si";
  if (TA_SCRIPT_RE.test(t)) return "ta";
  if (apiLang === "si") return "si";
  if (apiLang === "ta") return "ta";
  if (SINGLISH_MARKERS_RE.test(t) && !TANGLISH_MARKERS_RE.test(t)) return "singlish";
  if (TANGLISH_MARKERS_RE.test(t)) return "tanglish";
  return "en";
}
