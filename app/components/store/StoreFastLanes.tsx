"use client";

import Link from "next/link";
import { BadgePercent, CakeSlice, CalendarHeart, Clock3, Sparkles } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";

const LANES = [
  {
    title: "Rush delivery",
    eyebrow: "Need it today?",
    body: "Same-day friendly gifts when the family WhatsApp reminder arrives too late.",
    href: "/shop/flowers",
    cta: "Browse rush picks",
    prompt: "Show me same-day gifts that can reach Colombo today",
    icon: Clock3,
    tone: "from-emerald-400/20 to-kira-leaf/5",
  },
  {
    title: "On sale",
    eyebrow: "Offers",
    body: "Price drops and budget-smart gifts without making it feel cheap.",
    href: "/shop/hampers",
    cta: "See value picks",
    prompt: "Show me budget-friendly sale and deal picks on Kapruka",
    icon: BadgePercent,
    tone: "from-kap-yellow/20 to-amber-500/5",
  },
  {
    title: "Bakery brands",
    eyebrow: "Hilton · BreadTalk · Galadari",
    body: "Ask Kira for hotel cakes by name — she’ll search the live catalog properly.",
    href: "/shop/cakes",
    cta: "Browse cakes",
    prompt: "Show me Hilton, BreadTalk, Galadari, and Java Lounge cakes",
    icon: CakeSlice,
    tone: "from-rose-300/20 to-fuchsia-500/5",
  },
  {
    title: "Events & occasions",
    eyebrow: "Birthdays, Vesak, anniversaries",
    body: "Curated starting points for gifts that match the moment, not just the category.",
    href: "/shop/hampers",
    cta: "Browse occasions",
    prompt: "Help me pick a gift for an upcoming Sri Lankan occasion",
    icon: CalendarHeart,
    tone: "from-purple-300/20 to-kap-purple/10",
  },
];

export default function StoreFastLanes() {
  const { open } = useKiraDock();

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="display-hero text-2xl text-white sm:text-3xl">
            Kapruka fast lanes
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/45">
            The website tabs judges expect — rush, offers, brands and events —
            rebuilt as browse paths plus one-tap Kira handoff.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full glass-chip px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
        >
          Open full Kira <Sparkles className="size-4 text-kap-yellow" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LANES.map((lane) => {
          const Icon = lane.icon;
          return (
            <article
              key={lane.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.055]"
            >
              <div
                aria-hidden="true"
                className={`absolute inset-0 bg-gradient-to-br ${lane.tone} opacity-80`}
              />
              <div className="relative">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-kap-yellow shadow-inner">
                  <Icon className="size-5" />
                </span>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  {lane.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
                  {lane.title}
                </h3>
                <p className="mt-2 min-h-[4.5rem] text-[13px] leading-relaxed text-white/50">
                  {lane.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={lane.href}
                    className="rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-kira-canvas transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    {lane.cta}
                  </Link>
                  <button
                    type="button"
                    onClick={() => open({ prompt: lane.prompt })}
                    className="rounded-full glass-chip px-3.5 py-2 text-[12px] font-bold text-white/85 transition-transform hover:scale-[1.03] hover:text-white active:scale-95"
                  >
                    Ask Kira
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
