const CITIES =
  "| ISLANDWIDE DELIVERY | COLOMBO | KANDY | GALLE | JAFFNA | MATARA | NEGOMBO |";

export default function MarqueeTicker() {
  const line = `${CITIES} ${CITIES} `;
  return (
    <div
      className="relative overflow-hidden bg-black py-2.5 text-white"
      aria-hidden
    >
      <div className="marquee-ticker-track items-center">
        <span className="font-display whitespace-nowrap px-3 text-[13px] uppercase tracking-[0.12em] sm:text-sm">
          {line}
        </span>
        <span className="font-display whitespace-nowrap px-3 text-[13px] uppercase tracking-[0.12em] sm:text-sm">
          {line}
        </span>
      </div>
    </div>
  );
}
