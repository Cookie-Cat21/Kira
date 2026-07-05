/**
 * language-mode.mjs — script-aware language mode classification (Group Z contract).
 * Keep detection architectural — do NOT patch per-phrasing in callers.
 */

export const SI_SCRIPT_RE = /[඀-෿]/;
export const TA_SCRIPT_RE = /[஀-௿]/;

/** Romanized Singlish markers (heuristic, not exhaustive). */
export const SINGLISH_MARKERS_RE =
  /\b(machang|mata|matta|onna|one|karanna|karamu|oyata|eyata|den|mokak|kohomada|hari|bro|aiyo|kapruka|colombo|kopa|wena|ganna|yawan|deliver karanna)\b/i;

/** Romanized Tanglish markers (heuristic). */
export const TANGLISH_MARKERS_RE =
  /\b(venum|venda|pannunga|pannalam|eng(a|al)|naan|unga|avanga|machan|seri|itho|anuppa|deliver pann|colombo|kova|sapadu|gift venum)\b/i;

export const LANG_BLOCKS = [
  { mode: "en", idStart: 1, idEnd: 500, apiLang: "en" },
  { mode: "si", idStart: 501, idEnd: 1000, apiLang: "si" },
  { mode: "ta", idStart: 1001, idEnd: 1500, apiLang: "ta" },
  { mode: "singlish", idStart: 1501, idEnd: 2000, apiLang: "en" },
  { mode: "tanglish", idStart: 2001, idEnd: 2500, apiLang: "en" },
];

/** Classify user message + API language hint into one of 5 modes. */
export function detectLanguageMode(userText = "", apiLang = "en") {
  const t = (userText ?? "").trim();
  if (SI_SCRIPT_RE.test(t)) return "si";
  if (TA_SCRIPT_RE.test(t)) return "ta";
  if (apiLang === "si") return "si";
  if (apiLang === "ta") return "ta";
  if (SINGLISH_MARKERS_RE.test(t) && !TANGLISH_MARKERS_RE.test(t)) return "singlish";
  if (TANGLISH_MARKERS_RE.test(t)) return "tanglish";
  return "en";
}

export function blockForPersonaId(id) {
  const n = parseInt(String(id).replace(/^Z/i, ""), 10);
  if (Number.isNaN(n)) return "en";
  for (const b of LANG_BLOCKS) {
    if (n >= b.idStart && n <= b.idEnd) return b.mode;
  }
  return "en";
}

/** Assert response text matches the reply-language contract for a mode. */
export function assertReplyLanguage(mode, responseText) {
  const text = (responseText ?? "").trim();
  if (!text) return { pass: false, reason: "Empty response" };
  if (mode === "si") {
    return SI_SCRIPT_RE.test(text)
      ? { pass: true, reason: "" }
      : { pass: false, reason: "Expected Sinhala script in reply (si mode)" };
  }
  if (mode === "ta") {
    return TA_SCRIPT_RE.test(text)
      ? { pass: true, reason: "" }
      : { pass: false, reason: "Expected Tamil script in reply (ta mode)" };
  }
  const leakedSi = SI_SCRIPT_RE.test(text);
  const leakedTa = TA_SCRIPT_RE.test(text);
  if (leakedSi || leakedTa) {
    return {
      pass: false,
      reason: `${mode} mode must reply in English — found ${leakedSi ? "Sinhala" : ""}${leakedSi && leakedTa ? "+" : ""}${leakedTa ? "Tamil" : ""} script`,
    };
  }
  return { pass: true, reason: "" };
}
