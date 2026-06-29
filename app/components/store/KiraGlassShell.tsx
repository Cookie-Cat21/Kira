"use client";

import type { ReactNode } from "react";
import VerticalBarsNoise from "@/app/components/VerticalBarsNoise";

type Props = {
  children: ReactNode;
  radius: number;
  className?: string;
};

/**
 * Chat shell: soft animated bar field behind the UI. One blur layer max on
 * components — never on the whole panel.
 */
export default function KiraGlassShell({
  children,
  radius,
  className = "",
}: Props) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#0a0612] ${className}`}
      style={{ borderRadius: radius }}
    >
      <div className="absolute inset-0 scale-[1.03] opacity-90 blur-[1.5px]">
        <VerticalBarsNoise
          backgroundColor="#0a0612"
          lineColor="#221a34"
          barColor="#8a7ab8"
          animationSpeed={0.00016}
          intensity={0.5}
          calm
          showLines={false}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,6,18,0.5)_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
    </div>
  );
}
