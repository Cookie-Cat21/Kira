const MESSAGE =
  "🎂 Cakes · 💐 Flowers · 🎁 Hampers · 🍫 Chocolates · Islandwide delivery · 30+ cities · Powered by Kira ✨";

export default function AnnouncementBar() {
  const repeated = `${MESSAGE} · ${MESSAGE} · `;
  return (
    <div
      className="relative z-[90] h-8 overflow-hidden bg-kap-yellow text-kap-purple"
      aria-label="Store announcements"
    >
      <div className="marquee-track h-full items-center">
        <span className="whitespace-nowrap px-4 text-[12px] font-medium tracking-[0.05em]">
          {repeated}
        </span>
        <span
          className="whitespace-nowrap px-4 text-[12px] font-medium tracking-[0.05em]"
          aria-hidden
        >
          {repeated}
        </span>
      </div>
    </div>
  );
}
