"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION = 2;

export type GlowHorizonVariant = "top" | "bottom" | "left" | "right";

const VARIANTS: Record<
  GlowHorizonVariant,
  {
    axis: "x" | "y";
    scaleAxis: "scaleX" | "scaleY";
    enterPct: string;
    restPct: string;
  }
> = {
  top: { axis: "y", scaleAxis: "scaleY", enterPct: "-100%", restPct: "-50%" },
  bottom: { axis: "y", scaleAxis: "scaleY", enterPct: "100%", restPct: "50%" },
  left: { axis: "x", scaleAxis: "scaleX", enterPct: "100%", restPct: "50%" },
  right: { axis: "x", scaleAxis: "scaleX", enterPct: "-100%", restPct: "-50%" },
};

export interface GlowHorizonPalette {
  highlight: string;
  mid: string;
  deep: string;
  base: string;
  highlightShadow?: string;
}

/** Kapruka smile yellow + brand purple depth */
export const KAPRUKA_GLOW_PALETTE: GlowHorizonPalette = {
  highlight: "rgba(248, 218, 8, 0.88)",
  mid: "rgba(248, 218, 8, 0.42)",
  deep: "rgba(64, 41, 112, 0.72)",
  base: "#0d0818",
  highlightShadow: "0px -6px 32px 0px rgba(248, 218, 8, 0.42)",
};

export interface GlowHorizonProps {
  className?: string;
  variant?: GlowHorizonVariant;
  palette?: GlowHorizonPalette;
  /** Scale arc layers for hero prominence (default 1) */
  intensity?: number;
}

export default function GlowHorizon({
  className,
  variant = "top",
  palette = KAPRUKA_GLOW_PALETTE,
  intensity = 1,
}: GlowHorizonProps) {
  const reduceMotion = useReducedMotion();
  const { axis, scaleAxis, enterPct, restPct } = VARIANTS[variant];

  return (
    <motion.div
      className={"absolute h-full w-full " + (className ?? "")}
      style={{ isolation: "isolate" }}
      initial={
        reduceMotion
          ? { [axis]: restPct, [scaleAxis]: 1, opacity: 1, filter: "blur(0px)" }
          : { [axis]: enterPct, [scaleAxis]: 1.5, opacity: 0, filter: "blur(15px)" }
      }
      animate={{ [axis]: restPct, [scaleAxis]: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: reduceMotion ? 0 : DURATION, ease: EASE }}
    >
      <Arc
        variant={variant}
        color={palette.highlight}
        size={`${132 * intensity}%`}
        boxShadow={palette.highlightShadow}
        delay={reduceMotion ? 0 : 1.2}
        reduceMotion={!!reduceMotion}
      />
      <Arc
        variant={variant}
        color={palette.mid}
        size={`${120 * intensity}%`}
        initialOffset="10%"
        blur={31}
        delay={reduceMotion ? 0 : 0.6}
        reduceMotion={!!reduceMotion}
      />
      <Arc
        variant={variant}
        color={palette.deep}
        size={`${124 * intensity}%`}
        initialOffset="10%"
        blur={21}
        delay={0}
        reduceMotion={!!reduceMotion}
      />
      <Arc
        variant={variant}
        color={palette.base}
        size={`${120 * intensity}%`}
        initialOffset="10%"
        blur={51}
        delay={0}
        reduceMotion={!!reduceMotion}
      />
    </motion.div>
  );
}

function Arc({
  variant,
  color,
  size,
  initialOffset,
  blur,
  boxShadow,
  delay,
  reduceMotion,
}: {
  variant: GlowHorizonVariant;
  color: string;
  size: string;
  initialOffset?: string;
  blur?: number;
  boxShadow?: string;
  delay: number;
  reduceMotion: boolean;
}) {
  const scale = parseFloat(size) / 100;
  const { axis, enterPct } = VARIANTS[variant];
  const sign = enterPct.startsWith("-") ? -1 : 1;
  const startPct = initialOffset
    ? `${sign * Math.abs(parseFloat(initialOffset) - 50)}%`
    : undefined;

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 rounded-[100%]"
      style={{
        scale,
        background: color,
        ...(blur !== undefined && { filter: `blur(${blur}px)` }),
        ...(boxShadow && { boxShadow }),
      }}
      initial={startPct && !reduceMotion ? { [axis]: startPct } : false}
      animate={startPct && !reduceMotion ? { [axis]: 0 } : undefined}
      transition={{ duration: reduceMotion ? 0 : DURATION, ease: EASE, delay }}
    />
  );
}
