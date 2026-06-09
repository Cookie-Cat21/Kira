// Client-safe helpers — imported by app/page.tsx.
// Keep this file free of KIRA_SYSTEM_PROMPT to avoid bundling the huge
// server-only string into the client JS.

export interface OccasionChip {
  label: string;
  value: string;
  urgent?: boolean;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Full moon Poya dates (Sri Lanka) for 2026. */
const POYA_2026: [number, number][] = [
  [1, 13], [2, 12], [3, 13], [4, 12], [5, 11], [6, 11],
  [7, 10], [8, 9],  [9, 7],  [10, 7], [11, 5], [12, 4],
];

export function getOccasionChips(): OccasionChip[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const base: OccasionChip[] = [
    { label: "🎂 Birthday gift", value: "I need to send a birthday gift" },
    { label: "💐 Flowers & cake", value: "I want to send flowers and a cake" },
    { label: "🛍️ Just browsing", value: "What's popular on Kapruka right now?" },
    { label: "📦 Track an order", value: "I want to track my order" },
  ];

  // Tighter/shorter windows take priority over broader ones.

  // Avurudu: Apr 10–16 (very narrow — always first)
  if (month === 4 && day >= 10 && day <= 16) {
    return [{ label: "🌺 Avurudu gift", value: "I want to send an Avurudu gift", urgent: true }, ...base];
  }
  // Vesak full-moon week (May)
  if (month === 5 && day >= 10 && day <= 18) {
    return [{ label: "🌸 Vesak gift", value: "I want to send a Vesak gift", urgent: true }, ...base];
  }
  // Poson full-moon week (June) — check before Father's Day so it isn't swallowed
  if (month === 6 && day >= 7 && day <= 14) {
    return [{ label: "🕯️ Poson gift", value: "I want to send a Poson gift", urgent: true }, ...base];
  }
  // Mother's Day: 2nd Sunday of May — prioritise May 1–14
  if (month === 5 && day >= 1 && day <= 14) {
    return [{ label: "💝 Mother's Day gift", value: "I need a Mother's Day gift for amma", urgent: true }, ...base];
  }
  // Father's Day: 3rd Sunday of June — outside Poson window
  if (month === 6 && day >= 1 && day <= 21) {
    return [{ label: "👨 Father's Day gift", value: "I need a Father's Day gift for my dad", urgent: true }, ...base];
  }
  // Christmas season: Dec 10+
  if (month === 12 && day >= 10) {
    return [{ label: "🎄 Christmas gift", value: "I need a Christmas gift", urgent: true }, ...base];
  }

  // No upcoming occasion — evergreen
  return [
    { label: "🎁 Father's Day", value: "I need a Father's Day gift for my dad" },
    ...base,
  ];
}

export function getContextualGreeting(isReturning = false): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const dow = now.getDay(); // 0 Sun … 6 Sat

  // 1. Occasion override (highest priority — already culturally specific)
  const occasion = getUpcomingOccasionText(month, day);
  if (occasion) return occasion;

  // 2. Returning user — no need to explain how Kira works
  if (isReturning) {
    return pick([
      "Welcome back! 👋",
      "Back at it!",
      "Ayubowan again! 😊",
      "You're back!",
      "Good to see you again!",
    ]);
  }

  // 3. Poya day — check ±1 day around each full moon
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

  // 4. Night owl (10 pm – 4 am)
  if (hour >= 22 || hour < 5) {
    return pick([
      "Aiyo, up late? 😄",
      "Night owl! 🦉",
      "Still up? No judgment!",
      "Late-night shopping?",
    ]);
  }

  // 5. Day-of-week specials (Fri / Sat / Sun)
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

  // 6. Time-of-day (Mon – Thu)
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
  // Evening (5 pm – 10 pm)
  return pick([
    "Good evening! 🌙",
    "Evening!",
    "Hey, evening already!",
    "Evening! 🌙",
  ]);
}

function getUpcomingOccasionText(month: number, day: number): string | null {
  // Mirror the chip priority order (tighter windows first)
  if (month === 4 && day >= 10 && day <= 16) {
    return "Subha Aluth Avuruddak! 🌺 Looking for Avurudu gifts?";
  }
  if (month === 5 && day >= 10 && day <= 18) {
    return "Wishing you a blessed Vesak 🌸 Looking for something special?";
  }
  if (month === 6 && day >= 10 && day <= 14) {
    return "Happy Poson! 🕯️ Shopping for family?";
  }
  if (month === 5 && day >= 1 && day <= 14) {
    return "Mother's Day is around the corner — shopping for amma?";
  }
  if (month === 6 && day >= 1 && day <= 21) {
    return "Father's Day is coming up — looking for a gift for your dad?";
  }
  if (month === 12 && day >= 10) {
    return "Season's greetings! 🎄 Shopping for Christmas?";
  }
  return null;
}
