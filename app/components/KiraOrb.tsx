"use client";

import { cn } from "@/lib/utils";
import SiriWave from "@/app/components/ui/siri-wave";

export interface KiraOrbProps {
  /** Diameter of the orb in px. */
  size?: number;
  className?: string;
}

/**
 * Kira's floating presence — the Siri voice-wave shader in a circular clip.
 */
export function KiraOrb({ size = 52, className }: KiraOrbProps) {
  const renderScale = size <= 56 ? 1 : 0.75;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <SiriWave
        variant="wave"
        size={size}
        renderScale={renderScale}
        active
        className="size-full rounded-full"
      />

      {/* Soft inner vignette so the shader reads inside the dock button */}
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.45)]" />
    </div>
  );
}

export default KiraOrb;
