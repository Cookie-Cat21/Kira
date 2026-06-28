"use client";

import { motion, useReducedMotion } from "framer-motion";
import GlowHorizon from "./GlowHorizon";

const EASE = [0.16, 1, 0.3, 1] as const;

interface WelcomeHorizonProps {
  title?: string;
  subtitle?: string;
}

/**
 * Landing atmosphere: yellow horizon arc + blur-reveal welcome copy.
 * Sits behind hero content in KiraExperience opening state.
 */
export default function WelcomeHorizon({
  title = "Welcome to Caprica",
  subtitle = "Your Kapruka gift concierge",
}: WelcomeHorizonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <GlowHorizon variant="top" className="opacity-90" />

      {/* Soft vignette so text stays readable */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 18%, transparent 0%, rgba(13,8,24,0.35) 55%, rgba(13,8,24,0.75) 100%)",
        }}
      />

      <div className="absolute inset-x-0 top-[12%] flex flex-col items-center px-6 text-center sm:top-[14%]">
        <motion.p
          className="font-display text-[2.35rem] leading-[0.95] tracking-[0.04em] text-kap-yellow sm:text-5xl md:text-6xl"
          initial={
            reduceMotion
              ? { opacity: 1, filter: "blur(0px)", y: 0 }
              : { opacity: 0, filter: "blur(14px)", y: 12 }
          }
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 1.4,
            ease: EASE,
            delay: reduceMotion ? 0 : 0.9,
          }}
          style={{
            textShadow:
              "0 0 40px rgba(248,218,8,0.45), 0 0 80px rgba(248,218,8,0.2)",
          }}
        >
          {title}
        </motion.p>

        <motion.p
          className="mt-3 max-w-sm text-sm font-medium tracking-wide text-white/50 sm:text-base"
          initial={
            reduceMotion
              ? { opacity: 1, filter: "blur(0px)", y: 0 }
              : { opacity: 0, filter: "blur(10px)", y: 8 }
          }
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 1.1,
            ease: EASE,
            delay: reduceMotion ? 0 : 1.35,
          }}
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  );
}
