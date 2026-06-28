const COLOMBO_TZ = "Asia/Colombo";

function colomboParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return { year, month, day };
}

export function getColomboTodayIso(date = new Date()): string {
  const { year, month, day } = colomboParts(date);
  return `${year}-${month}-${day}`;
}

export function getColomboTomorrowIso(date = new Date()): string {
  const tomorrow = new Date(date.getTime() + 86_400_000);
  return getColomboTodayIso(tomorrow);
}

export function parseRelativeDeliveryDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) return getColomboTomorrowIso();
  if (/\btoday\b/.test(lower)) return getColomboTodayIso();
  return text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
}
