"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SiriWave from "@/app/components/ui/siri-wave";

const CROSSFADE = { duration: 0.75, ease: [0.4, 0, 0.2, 1] as const };

export interface KiraOrbProps {
  /** When true, shows the active voice-wave shader; otherwise fluid dots. */
  thinking?: boolean;
  /** Diameter of the orb in px. */
  size?: number;
  className?: string;
}

/**
 * Kira's floating presence — crossfades between the Siri wave (thinking)
 * and fluid metaball dots (idle) inside a circular clip.
 */
export function KiraOrb({ thinking = false, size = 52, className }: KiraOrbProps) {
  const renderScale = size <= 56 ? 1 : 0.75;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: thinking ? 1 : 0, scale: thinking ? 1 : 0.94 }}
        transition={CROSSFADE}
      >
        <SiriWave
          variant="wave"
          size={size}
          renderScale={renderScale}
          active={thinking}
          className="size-full rounded-full"
        />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: thinking ? 0 : 1, scale: thinking ? 1.06 : 1 }}
        transition={CROSSFADE}
      >
        <SiriWave
          variant="fluid-dots"
          size={size}
          renderScale={renderScale}
          active={!thinking}
          className="size-full rounded-full"
        />
      </motion.div>

      {/* Soft inner vignette so the shader reads inside the dock button */}
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.45)]" />
    </div>
  );
}

export default KiraOrb;
