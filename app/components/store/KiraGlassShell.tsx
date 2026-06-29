"use client";

import type { ReactNode } from "react";
import LiquidGlass, { LiquidGlassFilters } from "@/app/components/glass/LiquidGlass";
import KiraFrostedFilter from "@/app/components/glass/KiraFrostedFilter";
import VerticalBarsNoise from "@/app/components/VerticalBarsNoise";

type Props = {
  children: ReactNode;
  radius: number;
  className?: string;
};

/**
 * Full-panel liquid glass over the animated bar-noise field. The entire chat
 * surface is glass — no separate opaque core or glass border frame.
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
        <VerticalBarsNoise
          backgroundColor="#0a0612"
          lineColor="#2a1f42"
          barColor="#6b4fa8"
        />
        <LiquidGlass
          as="div"
          variant="clear"
          blur={6}
          radius={radius}
          displace
          frosted
          lens
          interactive
          live
          className="kira-glass-panel absolute inset-0 h-full w-full"
          contentClassName="flex h-full min-h-0 flex-col"
        >
          {children}
        </LiquidGlass>
      </div>
    </>
  );
}
