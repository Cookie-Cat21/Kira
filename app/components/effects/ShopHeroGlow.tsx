"use client";

import { motion, useReducedMotion } from "framer-motion";
import GlowHorizon from "./GlowHorizon";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Shop hero atmosphere: Kapruka-yellow horizon arc + blur-reveal welcome line.
 */
export default function ShopHeroGlow() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <GlowHorizon variant="top" className="opacity-95" />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 50% at 50% 0%, transparent 0%, rgba(13,8,24,0.4) 60%, rgba(13,8,24,0.85) 100%)",
        }}
      />

      <div className="absolute inset-x-0 top-8 flex justify-center px-6 sm:top-10">
        <motion.p
          className="font-display text-[2rem] leading-none tracking-[0.06em] text-kap-yellow sm:text-4xl md:text-5xl"
          initial={
            reduceMotion
              ? { opacity: 1, filter: "blur(0px)", y: 0 }
              : { opacity: 0, filter: "blur(14px)", y: 10 }
          }
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 1.3,
            ease: EASE,
            delay: reduceMotion ? 0 : 0.85,
          }}
          style={{
            textShadow:
              "0 0 36px rgba(248,218,8,0.4), 0 0 72px rgba(248,218,8,0.18)",
          }}
        >
          Welcome to Kapruka
        </motion.p>
      </div>
    </div>
  );
}
