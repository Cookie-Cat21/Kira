// Client-safe helpers — imported by app/page.tsx.
// Keep this file free of KIRA_SYSTEM_PROMPT to avoid bundling the huge
// server-only string into the client JS.

export interface OccasionChip {
  label: string;
  value: string;
  urgent?: boolean;
}

export interface StarterPrompt {
  label: string;
  value: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Full moon Poya dates (Sri Lanka) for 2026. */
const POYA_2026: [number, number][] = [
  [1, 13], [2, 12], [3, 13], [4, 12], [5, 11], [6, 11],
  [7, 10], [8, 9],  [9, 7],  [10, 7], [11, 5], [12, 4],
];

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / ms);
}

/** Nth Sunday of a month (1 = first Sunday, 3 = third Sunday). */
function nthSundayOfMonth(year: number, monthIndex: number, n: number): Date {
  const d = new Date(year, monthIndex, 1);
  let count = 0;
  while (count < n) {
    if (d.getDay() === 0) count++;
    if (count < n) d.setDate(d.getDate() + 1);
  }
  return d;
}

/** True when `target` is 0–`daysBefore` calendar days ahead of `now` (inclusive). */
function isApproachingOccasion(target: Date, now: Date, daysBefore: number): boolean {
  const daysUntil = daysBetween(now, target);
  return daysUntil >= 0 && daysUntil <= daysBefore;
}

const EVERGREEN_CHIPS: OccasionChip[] = [
  { label: "🎂 Birthday gift", value: "I need to send a birthday gift" },
  { label: "💐 Flowers & cake", value: "I want to send flowers and a cake" },
  { label: "🛍️ Just browsing", value: "What's popular on Kapruka right now?" },
  { label: "📦 Track an order", value: "I want to track my order" },
];

const EVERGREEN_LEADERS: OccasionChip[] = [
  { label: "🔥 Trending now", value: "What are the most popular gifts right now?" },
  { label: "🎁 Gift for family", value: "I want to send a gift to family in Sri Lanka" },
  { label: "💝 Under LKR 5,000", value: "Show me gift ideas under LKR 5,000" },
];

export function getOccasionChips(now = new Date()): OccasionChip[] {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  // Tighter/shorter windows take priority over broader ones.

  if (month === 4 && day >= 10 && day <= 16) {
    return [{ label: "🌺 Avurudu gift", value: "I want to send an Avurudu gift", urgent: true }, ...EVERGREEN_CHIPS];
  }
  if (month === 5 && day >= 10 && day <= 18) {
    return [{ label: "🌸 Vesak gift", value: "I want to send a Vesak gift", urgent: true }, ...EVERGREEN_CHIPS];
  }
  if (month === 6 && day >= 7 && day <= 14) {
    return [{ label: "🕯️ Poson gift", value: "I want to send a Poson gift", urgent: true }, ...EVERGREEN_CHIPS];
  }

  const mothersDay = nthSundayOfMonth(year, 4, 2); // May, 2nd Sunday
  if (isApproachingOccasion(mothersDay, now, 14)) {
    return [{ label: "💝 Mother's Day gift", value: "I need a Mother's Day gift for amma", urgent: true }, ...EVERGREEN_CHIPS];
  }

  const fathersDay = nthSundayOfMonth(year, 5, 3); // June, 3rd Sunday
  if (isApproachingOccasion(fathersDay, now, 14)) {
    return [{ label: "👨 Father's Day gift", value: "I need a Father's Day gift for my dad", urgent: true }, ...EVERGREEN_CHIPS];
  }

  if (month === 12 && day >= 10) {
    return [{ label: "🎄 Christmas gift", value: "I need a Christmas gift", urgent: true }, ...EVERGREEN_CHIPS];
  }

  // No active occasion — rotate evergreen leaders (never stale holidays).
  const lead = pick(EVERGREEN_LEADERS);
  return [lead, ...EVERGREEN_CHIPS.filter((c) => c.label !== lead.label)];
}

/** Quick-start row under the hero input — always current, never stale holidays. */
export function getStarterPrompts(now = new Date()): StarterPrompt[] {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const prompts: StarterPrompt[] = [
    { label: "Birthday gifts", value: "I need birthday gift ideas under LKR 5,000" },
    { label: "Track order", value: "I want to track my order" },
    { label: "Same-day in Colombo", value: "Show me gifts with same-day delivery in Colombo" },
    { label: "Popular now", value: "What are the most popular gifts right now?" },
  ];

  const fathersDay = nthSundayOfMonth(year, 5, 3);
  if (isApproachingOccasion(fathersDay, now, 14)) {
    return [
      { label: "Father's Day gifts", value: "I need a Father's Day gift for my dad under LKR 5,000" },
      ...prompts.filter((p) => p.label !== "Popular now"),
    ];
  }

  const mothersDay = nthSundayOfMonth(year, 4, 2);
  if (isApproachingOccasion(mothersDay, now, 14)) {
    return [
      { label: "Mother's Day gifts", value: "I need a Mother's Day gift for amma under LKR 5,000" },
      ...prompts.filter((p) => p.label !== "Popular now"),
    ];
  }

  if (month === 12 && day >= 10) {
    return [
      { label: "Christmas gifts", value: "I need Christmas gift ideas under LKR 5,000" },
      ...prompts.filter((p) => p.label !== "Popular now"),
    ];
  }

  return prompts;
}

export function getContextualGreeting(isReturning = false, now = new Date()): string {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const dow = now.getDay();
  const year = now.getFullYear();

  const occasion = getUpcomingOccasionText(now);
  if (occasion) return occasion;

  if (isReturning) {
    return pick([
      "Welcome back! 👋",
      "Back at it!",
      "Ayubowan again! 😊",
      "You're back!",
      "Good to see you again!",
    ]);
  }

  const isPoya = POYA_2026.some(([m, d]) =>
    m === month && Math.abs(d - day) <= 1
  );
  if (isPoya) {
    return pick([
      "Suba Poya! 🌕",
      "Happy Poya! 🌕",
      "Suba Poya diwasayak wewa! 🌕",
    ]);
  }

  if (hour >= 22 || hour < 5) {
    return pick([
      "Aiyo, up late? 😄",
      "Night owl! 🦉",
      "Still up? No judgment!",
      "Late-night shopping?",
    ]);
  }

  if (dow === 5) {
    return pick([
      "Happy Friday! 🎉",
      "That Friday feeling!",
      "TGIF! Treat someone today?",
      "Friday vibes! 🛍️",
    ]);
  }
  if (dow === 6) {
    return pick([
      "Happy Saturday! 🛍️",
      "Saturday session!",
      "Weekend mode!",
      "Aney, weekend already!",
    ]);
  }
  if (dow === 0) {
    return pick([
      "Happy Sunday! ☀️",
      "Sunday session!",
      "Lazy Sunday? Let's browse.",
      "Sunday vibes!",
    ]);
  }

  if (hour >= 5 && hour < 12) {
    return pick([
      "Good morning! ☀️",
      "Ayubowan! 🌸",
      "Morning!",
      "Early bird! ☕",
    ]);
  }
  if (hour >= 12 && hour < 17) {
    return pick([
      "Hey!",
      "Afternoon!",
      "Hey there!",
      "Good afternoon!",
    ]);
  }
  return pick([
    "Good evening! 🌙",
    "Evening!",
    "Hey, evening already!",
    "Evening! 🌙",
  ]);
}

function getUpcomingOccasionText(now = new Date()): string | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  if (month === 4 && day >= 10 && day <= 16) {
    return "Subha Aluth Avuruddak! 🌺 Looking for Avurudu gifts?";
  }
  if (month === 5 && day >= 10 && day <= 18) {
    return "Wishing you a blessed Vesak 🌸 Looking for something special?";
  }
  if (month === 6 && day >= 10 && day <= 14) {
    return "Happy Poson! 🕯️ Shopping for family?";
  }

  const mothersDay = nthSundayOfMonth(year, 4, 2);
  if (isApproachingOccasion(mothersDay, now, 14)) {
    return "Mother's Day is around the corner — shopping for amma?";
  }

  const fathersDay = nthSundayOfMonth(year, 5, 3);
  if (isApproachingOccasion(fathersDay, now, 14)) {
    return "Father's Day is coming up — looking for a gift for your dad?";
  }

  if (month === 12 && day >= 10) {
    return "Season's greetings! 🎄 Shopping for Christmas?";
  }
  return null;
}
