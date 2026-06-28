"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import GlowHorizon from "@/app/components/effects/GlowHorizon";
import { GlassButton } from "@/app/components/glass";
import KaprukaSmileMark from "@/app/components/brand/KaprukaSmileMark";
import { useKiraDock } from "@/app/context/KiraDockContext";
import type { StoreCategory } from "@/types/store";

const UI_EASE = [0.22, 1, 0.36, 1] as const;

export default function StoreHero({
  categories,
}: {
  categories: StoreCategory[];
}) {
  const { open: openKira } = useKiraDock();
  const reduceMotion = useReducedMotion();
  const topCategories = categories.slice(0, 6);
  const shopHref = topCategories[0]
    ? `/shop/${topCategories[0].slug}`
    : "/shop/cakes";

  const reveal = (delay: number) => ({
    initial: reduceMotion
      ? { opacity: 1, filter: "blur(0px)", y: 0 }
      : { opacity: 0, filter: "blur(10px)", y: 16 },
    animate: { opacity: 1, filter: "blur(0px)", y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.55,
      ease: UI_EASE,
      delay: reduceMotion ? 0 : delay,
    },
  });

  return (
    <section className="shop-hero relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-kira-canvas">
      {/* Horizon glow — cinematic hero moment */}
      <div className="pointer-events-none absolute inset-0">
        <GlowHorizon variant="top" intensity={1.22} />
        <div className="shop-hero-vignette absolute inset-0" aria-hidden />
        <div className="shop-hero-grain absolute inset-0" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <motion.div {...reveal(0.95)} className="mb-6">
          <KaprukaSmileMark className="mx-auto w-24 sm:w-28" />
        </motion.div>

        <motion.h1
          className="shop-hero-title font-display uppercase text-kap-yellow"
          {...reveal(1.05)}
        >
          Welcome to Kapruka
        </motion.h1>

        <motion.p
          className="mt-4 max-w-[18rem] text-[17px] leading-snug text-white/60 sm:max-w-xs"
          {...reveal(1.2)}
        >
          Gifts delivered across Sri Lanka.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full max-w-sm flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
          {...reveal(1.35)}
        >
          <Link
            href={shopHref}
            className="shop-hero-cta-primary lg-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-kap-yellow px-6 text-[15px] font-semibold text-kap-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kap-yellow/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kira-canvas"
          >
            Start shopping
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <GlassButton
            variant="ghost"
            size="md"
            onClick={() => openKira()}
            className="min-h-11 w-full sm:w-auto"
          >
            Ask Kira
          </GlassButton>
        </motion.div>
      </div>

      {topCategories.length > 0 && (
        <motion.nav
          className="relative z-10 mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-1 px-4 pb-10 pt-2"
          aria-label="Shop categories"
          {...reveal(1.5)}
        >
          {topCategories.map((category, i) => (
            <span key={category.slug} className="inline-flex items-center">
              {i > 0 && (
                <span aria-hidden className="mx-1 text-white/20">
                  ·
                </span>
              )}
              <Link
                href={`/shop/${category.slug}`}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-white/40 transition-colors duration-150 hover:text-kap-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {category.name}
              </Link>
            </span>
          ))}
        </motion.nav>
      )}
    </section>
  );
}
