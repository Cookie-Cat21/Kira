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
 * Chat chrome: soft animated noise + light blur. Glass material lives on the
 * individual UI components (input, chips) — not a full-panel displacement layer.
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
        <div className="absolute inset-0 opacity-[0.28]">
          <VerticalBarsNoise
            backgroundColor="#0a0612"
            lineColor="#1a1428"
            barColor="#4a3868"
            animationSpeed={0.00022}
            intensity={0.45}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[#0a0612]/72 backdrop-blur-[14px]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
      </div>
    </>
  );
}
