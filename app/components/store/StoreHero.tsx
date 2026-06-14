"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useKiraDock } from "@/app/context/KiraDockContext";

export default function StoreHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const { open: openKira } = useKiraDock();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !root.current) return;

    const ctx = gsap.context(() => {
      gsap.set([".hero-line", ".hero-sub", ".hero-cta"], { opacity: 0, y: 18 });
      gsap.set(".hero-tile", { opacity: 0, scale: 0.94 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 10, duration: 0.5 })
        .to(".hero-line", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.15")
        .to(".hero-sub", { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
        .to(".hero-cta", { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, "-=0.35")
        .to(".hero-tile", { opacity: 1, scale: 1, duration: 0.75, stagger: 0.1 }, "-=0.7");

      const onMove = (e: PointerEvent) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;
        gsap.to(".hero-tile", {
          x: (i: number) => dx * (6 + i * 4),
          y: (i: number) => dy * (6 + i * 4),
          duration: 1,
          ease: "power2.out",
        });
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative overflow-hidden">
      <div className="spotlight pointer-events-none absolute inset-x-0 top-0 h-[480px]" />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <span className="hero-eyebrow liquid-eyebrow inline-block">
            Islandwide delivery
          </span>

          <h1 className="display-serif mt-4 text-[2.75rem] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.5rem] lg:leading-[0.95]">
            <span className="hero-line block font-normal text-white/90">
              Send something
            </span>
            <span className="hero-line block">
              they&apos;ll{" "}
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                remember
              </span>
              .
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-sm text-[16px] font-normal leading-relaxed tracking-tight text-white/45">
            Cakes, flowers, hampers and more — delivered across Sri Lanka.
            Or tell Kira what you need.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            <Link
              href="/shop/cakes"
              className="hero-cta liquid-btn-primary group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              Shop now
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={openKira}
              className="hero-cta liquid-btn-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <Sparkles className="size-4 text-white/70" /> Ask Kira
            </button>
          </div>
        </div>

        <div className="relative z-10 hidden h-[400px] lg:block">
          <HeroTile className="ph-cakes left-4 top-6 h-48 w-40 rotate-[-5deg]" label="Cakes" />
          <HeroTile className="ph-flowers right-8 top-2 h-52 w-40 rotate-[4deg]" label="Flowers" />
          <HeroTile className="ph-hampers bottom-4 left-20 h-48 w-44 rotate-[2deg]" label="Hampers" />
          <HeroTile className="ph-chocolates bottom-12 right-2 h-40 w-36 rotate-[-3deg]" label="Chocolates" />
        </div>
      </div>
    </div>
  );
}

function HeroTile({ className, label }: { className: string; label: string }) {
  return (
    <div
      className={`hero-tile ph-tile liquid-glass-card absolute flex items-end overflow-hidden rounded-[22px] p-4 ${className}`}
    >
      <span className="text-[13px] font-medium tracking-tight text-white/80">{label}</span>
    </div>
  );
}
