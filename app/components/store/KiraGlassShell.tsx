"use client";

import type { ReactNode } from "react";
import LiquidGlass, { LiquidGlassFilters } from "@/app/components/glass/LiquidGlass";
import KiraFrostedFilter from "@/app/components/glass/KiraFrostedFilter";

type Props = {
  children: ReactNode;
  /** Corner radius in px — animates with the dock expand transition. */
  radius: number;
  /** Rim thickness in px — the refractive see-through band. */
  rim?: number;
  className?: string;
};

/**
 * Floating Kira shell: refractive glass rim (see-through edges) around an opaque
 * chat core. Combines the Bespalov frosted backdrop filter with our chromatic
 * SVG displacement stack.
 */
export default function KiraGlassShell({
  children,
  radius,
  rim = 22,
  className = "",
}: Props) {
  return (
    <>
      <LiquidGlassFilters />
      <KiraFrostedFilter />
      <LiquidGlass
        as="div"
        variant="clear"
        blur={4}
        radius={radius}
        displace
        lens
        interactive
        live
        className={`kira-glass-shell h-full w-full ${className}`}
        contentClassName="h-full"
        style={
          {
            "--kira-rim": `${rim}px`,
            "--kira-core-radius": `${Math.max(8, radius - rim * 0.55)}px`,
          } as React.CSSProperties
        }
      >
        <div className="kira-glass-rim" aria-hidden="true" />
        <div className="kira-glass-core h-full min-h-0 overflow-hidden">
          {children}
        </div>
      </LiquidGlass>
    </>
  );
}
