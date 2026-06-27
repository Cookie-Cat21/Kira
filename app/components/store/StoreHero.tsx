"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";

export default function StoreHero() {
  const { open: openKira } = useKiraDock();

  return (
    <div className="relative overflow-hidden">
      {/* spotlight + ambient blobs */}
      <div className="spotlight pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-60px",
          left: "-40px",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(64,41,112,0.55) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "-80px",
          right: "-60px",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(248,218,8,0.10) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-5 pb-16 pt-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-28">
        {/* Copy */}
        <div className="relative z-10">
          <span className="hero-eyebrow inline-flex items-center gap-1.5 rounded-full glass-chip px-3 py-1 text-[12px] font-medium text-white/70">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-kira-leaf opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-kira-leaf" />
            </span>
            Live catalog · Islandwide delivery
          </span>

          <h1 className="display-hero mt-5 text-6xl tracking-[-0.035em] text-white sm:text-7xl lg:text-[5.75rem] lg:leading-[0.93]">
            <span className="hero-line block">Send something</span>
            <span className="hero-line block">
              they&apos;ll{" "}
              <span className="bg-gradient-to-r from-kap-yellow to-[#ffe87a] bg-clip-text text-transparent">
                remember
              </span>
              .
            </span>
          </h1>

          <p className="hero-sub mt-7 max-w-md text-[17px] leading-relaxed text-white/55">
            Cakes, flowers, hampers and more — delivered across Sri Lanka. Or
            just tell Kira what you need, and she&apos;ll find it, check delivery,
            and check you out.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/shop/cakes"
              className="hero-cta group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-kira-canvas transition-transform hover:scale-[1.03] active:scale-95"
            >
              Start shopping
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => openKira()}
              className="hero-cta inline-flex items-center gap-2 rounded-full glass-card px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Sparkles className="size-4 text-kap-yellow" /> Ask Kira
            </button>
          </div>
        </div>

        {/* Visual collage */}
        <div className="relative z-10 hidden h-[420px] lg:block">
          <HeroTile className="ph-cakes left-2 top-4 h-52 w-44 rotate-[-6deg]" label="Cakes" />
          <HeroTile className="ph-flowers right-6 top-0 h-56 w-44 rotate-[5deg]" label="Flowers" />
          <HeroTile className="ph-hampers bottom-2 left-24 h-52 w-48 rotate-[3deg]" label="Hampers" />
          <HeroTile className="ph-chocolates bottom-10 right-0 h-44 w-40 rotate-[-4deg]" label="Chocolates" />
        </div>
      </div>
    </div>
  );
}

function HeroTile({ className, label }: { className: string; label: string }) {
  return (
    <div
      className={`hero-tile ph-tile absolute flex items-end rounded-3xl border border-white/10 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ${className}`}
    >
      <span className="text-sm font-medium text-white/85">{label}</span>
    </div>
  );
}
