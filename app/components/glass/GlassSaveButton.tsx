"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import LiquidGlass from "./LiquidGlass";
import { IconHeart, IconHeartFilled } from "./icons";

type Size = "sm" | "md";

type Props = {
  /** Controlled saved state. Omit to run uncontrolled. */
  saved?: boolean;
  defaultSaved?: boolean;
  onChange?: (saved: boolean) => void;
  size?: Size;
  className?: string;
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[14px]",
};

const ACCENT = "#ff5a7e";
/** Six sparks on a ring around the heart — precomputed so we never call
 *  Math.random (keeps render deterministic). */
const SPARKS = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2;
  return { x: Math.cos(a) * 22, y: Math.sin(a) * 22, i };
});

/**
 * The "Save" button, made engaging — a save/like TOGGLE with:
 *  - gel press (springy squish + overshoot, via .lg-gel)
 *  - the heart filling with a spring pop on save + a one-shot spark/ring burst
 *  - "Save" ⇄ "Saved" label morph and a warm glass tint when saved
 *  - the inherited cursor-tracked specular gleam from LiquidGlass
 * All large motion + particles are gated behind prefers-reduced-motion; the
 * fill/tint state change (the actual feedback) always survives.
 */
export default function GlassSaveButton({
  saved: controlledSaved,
  defaultSaved = false,
  onChange,
  size = "md",
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const [inner, setInner] = useState(defaultSaved);
  const [burst, setBurst] = useState(0);

  const controlled = controlledSaved !== undefined;
  const saved = controlled ? controlledSaved : inner;

  const toggle = () => {
    const next = !saved;
    if (!controlled) setInner(next);
    onChange?.(next);
    if (next && !reduce) setBurst((b) => b + 1); // burst only when saving
  };

  return (
    <LiquidGlass
      as="button"
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Saved" : "Save"}
      onClick={toggle}
      radius={999}
      blur={8}
      tint={saved ? "rgba(255,90,126,0.12)" : undefined}
      className={`lg-gel relative inline-flex items-center justify-center font-medium text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 ${SIZES[size]} ${className}`}
      contentClassName="inline-flex items-center justify-center gap-2"
    >
      {/* Heart + burst */}
      <span className="relative grid h-[18px] w-[18px] place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {saved ? (
            <motion.span
              key="filled"
              className="grid"
              style={{ color: ACCENT }}
              initial={reduce ? false : { scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={reduce ? {} : { scale: 0 }}
              transition={{ type: "spring", stiffness: 640, damping: 16 }}
            >
              <IconHeartFilled />
            </motion.span>
          ) : (
            <motion.span
              key="outline"
              className="grid"
              initial={false}
              animate={reduce ? {} : { scale: [1, 0.85, 1] }}
              transition={{ duration: 0.25 }}
            >
              <IconHeart />
            </motion.span>
          )}
        </AnimatePresence>

        {/* One-shot like-burst: an expanding ring + radiating sparks. Keyed so a
            new save replays it; pointer-events-none so it never blocks clicks. */}
        {burst > 0 && (
          <span
            key={burst}
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <motion.span
              className="absolute rounded-full"
              style={{ width: 18, height: 18, border: `2px solid ${ACCENT}` }}
              initial={{ scale: 0.5, opacity: 0.7 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {SPARKS.map((s) => (
              <motion.span
                key={s.i}
                className="absolute rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: s.i % 2 ? ACCENT : "#f8da08",
                }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: s.x, y: s.y, scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </span>
        )}
      </span>

      {/* Label morph */}
      <span className="grid text-center" style={{ minWidth: "4.2ch" }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={saved ? "saved" : "save"}
            className="col-start-1 row-start-1"
            initial={reduce ? false : { y: 9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: -9, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {saved ? "Saved" : "Save"}
          </motion.span>
        </AnimatePresence>
      </span>
    </LiquidGlass>
  );
}
