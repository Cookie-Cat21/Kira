import Link from "next/link";
import Reveal from "./Reveal";

const OCCASIONS = [
  { label: "Birthday", icon: "🎂", href: "/shop/cakes" },
  { label: "Anniversary", icon: "💐", href: "/shop/flowers" },
  { label: "Hampers", icon: "🎁", href: "/shop/hampers" },
  { label: "Chocolates", icon: "🍫", href: "/shop/chocolates" },
  { label: "Plants", icon: "🪴", href: "/shop/plants" },
  { label: "New In", icon: "✨", href: "/shop" },
] as const;

export default function OccasionCircles() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <Reveal>
        <div className="scrollbar-hide -mx-5 flex justify-center gap-6 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
          {OCCASIONS.map(({ label, icon, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex w-[88px] shrink-0 flex-col items-center gap-2.5 sm:w-[96px]"
            >
              <span className="flex size-[88px] items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-[28px] transition-all group-hover:scale-105 group-hover:bg-white/[0.14] sm:size-24 sm:text-[32px]">
                {icon}
              </span>
              <span className="text-center text-[11px] font-medium text-white/70">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
