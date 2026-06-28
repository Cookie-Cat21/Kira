"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import GlowHorizon from "@/app/components/effects/GlowHorizon";
import { useKiraDock } from "@/app/context/KiraDockContext";
import type { StoreCategory } from "@/types/store";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function StoreHero({
  categories,
}: {
  categories: StoreCategory[];
}) {
  const { open: openKira } = useKiraDock();
  const reduceMotion = useReducedMotion();
  const topCategories = categories.slice(0, 6);

  const fade = (delay: number) => ({
    initial: reduceMotion
      ? { opacity: 1, filter: "blur(0px)", y: 0 }
      : { opacity: 0, filter: "blur(12px)", y: 14 },
    animate: { opacity: 1, filter: "blur(0px)", y: 0 },
    transition: { duration: reduceMotion ? 0 : 1.1, ease: EASE, delay: reduceMotion ? 0 : delay },
  });

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-kira-canvas">
      {/* Horizon glow — the hero */}
      <div className="pointer-events-none absolute inset-0">
        <GlowHorizon variant="top" className="opacity-100" intensity={1.15} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 38%, transparent 0%, rgba(13,8,24,0.25) 45%, rgba(13,8,24,0.92) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <motion.h1
          className="font-display text-5xl leading-[0.92] tracking-[0.05em] text-kap-yellow sm:text-6xl md:text-7xl"
          {...fade(0.75)}
          style={{
            textShadow:
              "0 0 48px rgba(248,218,8,0.45), 0 0 96px rgba(248,218,8,0.2)",
          }}
        >
          Welcome to Kapruka
        </motion.h1>

        <motion.p
          className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/45 sm:text-base"
          {...fade(1.15)}
        >
          Cakes, flowers, hampers and more — delivered across Sri Lanka.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
          {...fade(1.45)}
        >
          <Link
            href={topCategories[0] ? `/shop/${topCategories[0].slug}` : "/shop/cakes"}
            className="group inline-flex items-center gap-2 rounded-full bg-kap-yellow px-6 py-3 text-sm font-semibold text-kap-purple transition-transform hover:scale-[1.03] active:scale-95"
          >
            Start shopping
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => openKira()}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition-transform hover:scale-[1.03] hover:border-white/20 active:scale-95"
          >
            <Sparkles className="size-4 text-kap-yellow" />
            Ask Kira
          </button>
        </motion.div>

        {topCategories.length > 0 && (
          <motion.nav
            className="mt-14 flex flex-wrap items-center justify-center gap-x-1 gap-y-2"
            aria-label="Shop categories"
            {...fade(1.75)}
          >
            {topCategories.map((category, i) => (
              <span key={category.slug} className="inline-flex items-center">
                {i > 0 && (
                  <span aria-hidden className="mx-2 text-white/15">
                    ·
                  </span>
                )}
                <Link
                  href={`/shop/${category.slug}`}
                  className="text-[13px] font-medium text-white/35 transition-colors hover:text-kap-yellow/90"
                >
                  {category.name}
                </Link>
              </span>
            ))}
          </motion.nav>
        )}
      </div>
    </section>
  );
}
