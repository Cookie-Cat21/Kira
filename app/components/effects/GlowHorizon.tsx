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

export interface GlowArcSpec {
  background: string;
  size: string;
  blur?: number;
  boxShadow?: string;
  delay: number;
  initialOffset?: string;
  opacity?: number;
}

/** Layered sunset — champagne rim, warm gold body, plum depth (not flat yellow). */
export const KAPRUKA_GLOW_LAYERS: GlowArcSpec[] = [
  {
    background:
      "radial-gradient(ellipse 130% 55% at 50% 100%, rgba(255,252,245,0.22) 0%, rgba(235,210,140,0.1) 28%, transparent 62%)",
    size: "134%",
    blur: 6,
    boxShadow: "0 -12px 56px rgba(212, 178, 96, 0.12)",
    delay: 1.15,
  },
  {
    background:
      "radial-gradient(ellipse 115% 50% at 50% 95%, rgba(232, 196, 106, 0.28) 0%, rgba(248, 218, 8, 0.09) 42%, transparent 72%)",
    size: "120%",
    blur: 38,
    delay: 0.65,
    initialOffset: "10%",
  },
  {
    background:
      "radial-gradient(ellipse 105% 45% at 50% 88%, rgba(158, 98, 48, 0.2) 0%, rgba(88, 52, 28, 0.08) 50%, transparent 78%)",
    size: "124%",
    blur: 30,
    delay: 0.35,
    initialOffset: "9%",
  },
  {
    background:
      "radial-gradient(ellipse 100% 55% at 50% 75%, rgba(64, 41, 112, 0.42) 0%, rgba(28, 16, 48, 0.55) 48%, transparent 85%)",
    size: "126%",
    blur: 24,
    delay: 0,
    initialOffset: "10%",
  },
  {
    background: "radial-gradient(ellipse 95% 60% at 50% 70%, #0a0612 0%, #050308 100%)",
    size: "118%",
    blur: 52,
    delay: 0,
    initialOffset: "10%",
  },
];

export interface GlowHorizonPalette {
  highlight: string;
  mid: string;
  deep: string;
  base: string;
  highlightShadow?: string;
}

/** @deprecated Use KAPRUKA_GLOW_LAYERS — kept for simple overrides */
export const KAPRUKA_GLOW_PALETTE: GlowHorizonPalette = {
  highlight: "rgba(235, 210, 140, 0.35)",
  mid: "rgba(232, 196, 106, 0.22)",
  deep: "rgba(64, 41, 112, 0.55)",
  base: "#0a0612",
  highlightShadow: "0px -10px 48px 0px rgba(212, 178, 96, 0.14)",
};

export interface GlowHorizonProps {
  className?: string;
  variant?: GlowHorizonVariant;
  palette?: GlowHorizonPalette;
  layers?: GlowArcSpec[];
  intensity?: number;
}

export default function GlowHorizon({
  className,
  variant = "top",
  layers = KAPRUKA_GLOW_LAYERS,
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
      {layers.map((layer, i) => (
        <Arc
          key={i}
          variant={variant}
          background={layer.background}
          size={`${parseFloat(layer.size) * intensity}%`}
          blur={layer.blur}
          boxShadow={layer.boxShadow}
          delay={reduceMotion ? 0 : layer.delay}
          initialOffset={layer.initialOffset}
          opacity={layer.opacity}
          reduceMotion={!!reduceMotion}
        />
      ))}
    </motion.div>
  );
}

function Arc({
  variant,
  background,
  size,
  initialOffset,
  blur,
  boxShadow,
  delay,
  opacity = 1,
  reduceMotion,
}: {
  variant: GlowHorizonVariant;
  background: string;
  size: string;
  initialOffset?: string;
  blur?: number;
  boxShadow?: string;
  delay: number;
  opacity?: number;
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
        background,
        opacity,
        ...(blur !== undefined && { filter: `blur(${blur}px)` }),
        ...(boxShadow && { boxShadow }),
      }}
      initial={startPct && !reduceMotion ? { [axis]: startPct } : false}
      animate={startPct && !reduceMotion ? { [axis]: 0 } : undefined}
      transition={{ duration: reduceMotion ? 0 : DURATION, ease: EASE, delay }}
    />
  );
}
