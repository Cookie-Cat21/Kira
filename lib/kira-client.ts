// Client-safe helpers — imported by app/page.tsx.
// Keep this file free of KIRA_SYSTEM_PROMPT to avoid bundling the huge
// server-only string into the client JS.

export interface OccasionChip {
  label: string;
  value: string;
  urgent?: boolean;
}

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

  // Father's Day: 3rd Sunday of June — prioritise Jun 1–21
  if (month === 6 && day >= 1 && day <= 21) {
    return [
      { label: "👨 Father's Day gift", value: "I need a Father's Day gift for my dad", urgent: true },
      ...base,
    ];
  }
  // Mother's Day: 2nd Sunday of May — prioritise May 1–14
  if (month === 5 && day >= 1 && day <= 14) {
    return [
      { label: "💝 Mother's Day gift", value: "I need a Mother's Day gift for amma", urgent: true },
      ...base,
    ];
  }
  // Vesak / Poson — Buddhist occasions in May/June
  if ((month === 5 && day >= 10 && day <= 18) || (month === 6 && day >= 8 && day <= 15)) {
    const occasionLabel = month === 5 ? "🌸 Vesak gift" : "🕯️ Poson gift";
    const occasionValue = month === 5 ? "I want to send a Vesak gift" : "I want to send a Poson gift";
    return [{ label: occasionLabel, value: occasionValue, urgent: true }, ...base];
  }
  // Avurudu: Apr 10–16
  if (month === 4 && day >= 10 && day <= 16) {
    return [
      { label: "🌺 Avurudu gift", value: "I want to send an Avurudu gift", urgent: true },
      ...base,
    ];
  }
  // Christmas season: Dec 10+
  if (month === 12 && day >= 10) {
    return [
      { label: "🎄 Christmas gift", value: "I need a Christmas gift", urgent: true },
      ...base,
    ];
  }

  // No upcoming occasion — default set with Father's Day as evergreen option
  return [
    { label: "🎁 Father's Day", value: "I need a Father's Day gift for my dad" },
    ...base,
  ];
}

export function getContextualGreeting(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();

  let timeGreeting = "Hey!";
  if (hour >= 5 && hour < 12) timeGreeting = "Good morning!";
  else if (hour >= 12 && hour < 17) timeGreeting = "Hey!";
  else if (hour >= 17 && hour < 21) timeGreeting = "Good evening!";
  else timeGreeting = "Hey, up late?";

  const occasion = getUpcomingOccasionText(month, day);
  if (occasion) return `${timeGreeting} ${occasion}`;
  return timeGreeting;
}

function getUpcomingOccasionText(month: number, day: number): string | null {
  if (month === 6 && day >= 1 && day <= 21) {
    return "Father's Day is coming up — looking for a gift for your dad?";
  }
  if (month === 5 && day >= 1 && day <= 14) {
    return "Mother's Day is around the corner — shopping for amma?";
  }
  if (month === 5 && day >= 10 && day <= 18) {
    return "Wishing you a blessed Vesak 🌸 Looking for something special?";
  }
  if (month === 6 && day >= 8 && day <= 15) {
    return "Happy Poson! 🕯️ Shopping for family?";
  }
  if (month === 4 && day >= 10 && day <= 16) {
    return "Subha Aluth Avuruddak! 🌺 Looking for Avurudu gifts?";
  }
  if (month === 12 && day >= 10) {
    return "Season's greetings! 🎄 Shopping for Christmas?";
  }
  return null;
}
