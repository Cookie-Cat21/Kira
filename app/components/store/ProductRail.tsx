"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KiraProduct } from "@/types";
import StoreProductCard from "./StoreProductCard";
import Reveal from "./Reveal";

export default function ProductRail({
  title,
  subtitle,
  items,
  categorySlug,
}: {
  title: string;
  subtitle?: string;
  items: KiraProduct[];
  categorySlug?: string;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);

  function nudge(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      <Reveal className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="display-hero text-xl text-white sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-[13px] text-white/38">{subtitle}</p>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="flex size-8 items-center justify-center rounded-full liquid-glass-pill text-white/70"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            className="flex size-8 items-center justify-center rounded-full liquid-glass-pill text-white/70"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </Reveal>

      <div
        ref={scroller}
        className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:gap-3.5 sm:px-0"
      >
        {items.map((p, i) => (
          <div
            key={p.id}
            className="w-[42vw] max-w-[220px] shrink-0 snap-start sm:w-[220px]"
          >
            <Reveal delay={Math.min(i * 50, 300)} className="h-full">
              <StoreProductCard product={p} categorySlug={categorySlug} />
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
