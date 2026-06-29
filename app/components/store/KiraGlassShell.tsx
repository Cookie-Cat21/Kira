"use client";

import type { ReactNode } from "react";
import { LiquidGlassFilters } from "@/app/components/glass/LiquidGlass";
import KiraFrostedFilter from "@/app/components/glass/KiraFrostedFilter";
import VerticalBarsNoise from "@/app/components/VerticalBarsNoise";

type Props = {
  children: ReactNode;
  radius: number;
  className?: string;
};

/**
 * Chat chrome: animated bar-noise fills the panel; a whisper of blur keeps it
 * from overpowering the UI. Glass material lives on individual components.
 */
export default function KiraGlassShell({
  children,
  radius,
  className = "",
}: Props) {
  return (
    <>
      <LiquidGlassFilters />
      <KiraFrostedFilter />
      <div
        className={`relative h-full w-full overflow-hidden ${className}`}
        style={{ borderRadius: radius }}
      >
        {/* Animated background — full strength, always on */}
        <VerticalBarsNoise
          backgroundColor="#0a0612"
          lineColor="#2a1f42"
          barColor="#6b4fa8"
          animationSpeed={0.00028}
          intensity={0.72}
        />
        {/* Light soften — visible bars, not a flat wipe */}
        <div
          className="pointer-events-none absolute inset-0 bg-[#0a0612]/20 backdrop-blur-[5px]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
      </div>
    </>
  );
}
