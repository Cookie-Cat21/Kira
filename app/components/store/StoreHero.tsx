"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useKiraDock } from "@/app/context/KiraDockContext";
import ShopHeroGlow from "@/app/components/effects/ShopHeroGlow";

const HERO_TILES = [
  {
    label: "Cakes",
    href: "/shop/cakes",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
    className: "left-2 top-4 h-52 w-44 rotate-[-6deg]",
  },
  {
    label: "Flowers",
    href: "/shop/flowers",
    image:
      "https://images.unsplash.com/photo-1490750967868-88df5691cc8b?w=500&q=80",
    className: "right-6 top-0 h-56 w-44 rotate-[5deg]",
  },
  {
    label: "Hampers",
    href: "/shop/hampers",
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    className: "bottom-2 left-24 h-52 w-48 rotate-[3deg]",
  },
  {
    label: "Chocolates",
    href: "/shop/chocolates",
    image:
      "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&q=80",
    className: "bottom-10 right-0 h-44 w-40 rotate-[-4deg]",
  },
] as const;

export default function StoreHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const { open: openKira } = useKiraDock();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !root.current) return;

    // Inside gsap.context, plain string selectors are auto-scoped to `root`.
    const ctx = gsap.context(() => {
      gsap.set([".hero-line", ".hero-sub", ".hero-cta"], { opacity: 0, y: 22 });
      gsap.set(".hero-tile", { opacity: 0, scale: 0.9 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 12, duration: 0.6 })
        .to(".hero-line", { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.2")
        .to(".hero-sub", { opacity: 1, y: 0, duration: 0.7 }, "-=0.55")
        .to(".hero-cta", { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, "-=0.4")
        .to(".hero-tile", { opacity: 1, scale: 1, duration: 0.85, stagger: 0.12 }, "-=0.85");

      // gentle parallax on pointer move
      const onMove = (e: PointerEvent) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;
        gsap.to(".hero-tile", {
          x: (i: number) => dx * (10 + i * 6),
          y: (i: number) => dy * (10 + i * 6),
          duration: 0.8,
          ease: "power2.out",
        });
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="relative overflow-hidden"
    >
      <ShopHeroGlow />

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-36">
        {/* Copy */}
        <div className="relative z-10">
          <span className="hero-eyebrow inline-flex items-center gap-1.5 rounded-full glass-chip px-3 py-1 text-[12px] font-medium text-white/70">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-kira-leaf opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-kira-leaf" />
            </span>
            Live catalog · Islandwide delivery
          </span>

          <h1 className="display-hero mt-5 text-6xl text-white sm:text-7xl lg:text-[5.75rem] lg:leading-[0.93]">
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
          {HERO_TILES.map((tile) => (
            <HeroTile key={tile.label} {...tile} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroTile({
  className,
  label,
  href,
  image,
}: {
  className: string;
  label: string;
  href: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className={`hero-tile absolute overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ${className}`}
    >
      <Image
        src={image}
        alt={label}
        fill
        sizes="200px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <span className="absolute bottom-4 left-4 text-sm font-medium text-white/90">
        {label}
      </span>
    </Link>
  );
}
