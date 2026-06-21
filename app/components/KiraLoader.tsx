"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Letter columns — clip-path inset values ("top right bottom left")
// derived from SVG path coordinates; viewBox is 625 × 110.
const LETTERS = [
  { id: "k1", clip: "0% 86%  0% 0%"  },  // x   0 –  82
  { id: "a1", clip: "0% 71%  0% 14%" },  // x  88 – 178
  { id: "p",  clip: "0% 54%  0% 30%" },  // x 188 – 288
  { id: "r",  clip: "0% 46%  0% 46%" },  // x 288 – 338
  { id: "k2", clip: "0% 15%  0% 71%" },  // x 448 – 528
  { id: "a2", clip: "0% 0%   0% 84%" },  // x 525 – 625
];

function getLetterDelay(index: number) {
  const BASE = 0.18;
  const STEP = 0.08;
  // Gap after 'r' (index 3) to let the smile breathe
  return index >= 4
    ? BASE + index * STEP + 0.18
    : BASE + index * STEP;
}

// Smile clip sweeps for 0.55 s starting at 0.50 s
const STROKE_START    = 0.50;
const STROKE_DURATION = 0.55;

interface KiraLoaderProps {
  onDone: () => void;
}

export default function KiraLoader({ onDone }: KiraLoaderProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 700);
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="kira-loader"
          initial={{ opacity: 1, y: 0 }}
          exit={{ y: "-100%", opacity: 1 }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-kira-bg"
        >
          {/* Grain overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-10"
          >
            {/* ── Logo ── */}
            <div
              className="relative w-[280px] sm:w-[340px]"
              style={{ aspectRatio: "625 / 110" }}
            >

              {/* White letter columns — staggered fade-up */}
              {LETTERS.map((letter, i) => (
                <motion.div
                  key={letter.id}
                  className="absolute inset-0"
                  style={{ clipPath: `inset(${letter.clip})` }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: getLetterDelay(i),
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/kapruka-logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full"
                    draggable={false}
                  />
                </motion.div>
              ))}

              {/* ── Smile — inline SVG, yellow removed from the img file so no letter
                  clip can ever bleed it. Clip sweeps left → right on the fill path. ── */}
              <svg
                viewBox="0 0 625 110"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <clipPath id="smile-reveal">
                    <motion.rect
                      x={328}
                      y={40}
                      height={60}
                      initial={{ width: 0 }}
                      animate={{ width: 112 }}
                      transition={{
                        delay: STROKE_START,
                        duration: STROKE_DURATION,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    />
                  </clipPath>
                </defs>
                <path
                  fill="#f8da08"
                  clipPath="url(#smile-reveal)"
                  d="M402.986267,67.193703 C411.020386,61.704575 416.238495,54.617882 418.415070,45.324123 C424.890198,45.324123 431.318146,45.324123 437.750275,45.324123 C437.129608,66.508202 416.547272,90.716156 386.719543,92.762413 C356.255249,94.852348 331.226654,71.531693 328.261810,45.118824 C334.079407,45.118824 339.857269,44.962524 345.612488,45.253811 C346.731842,45.310467 348.364868,46.921478 348.743073,48.133221 C353.218384,62.471653 368.281891,74.652725 385.670837,72.854988 C391.454773,72.257019 396.988068,69.234306 402.986267,67.193703 z"
                />
              </svg>

            </div>

            {/* ── Loading bar ── */}
            <div className="relative w-[280px] sm:w-[340px]">
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-kira-border">
                <motion.div
                  className="relative h-full overflow-hidden rounded-full bg-kap-purple"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.9,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.4,
                  }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-y-0 w-24 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
                      filter: "blur(2px)",
                    }}
                    initial={{ left: "-40%" }}
                    animate={{ left: "120%" }}
                    transition={{
                      duration: 1.4,
                      ease: "easeInOut",
                      delay: 0.6,
                      repeat: Infinity,
                      repeatDelay: 0.4,
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Footer wordmark */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute bottom-10 text-xs font-sans uppercase tracking-[0.35em] text-kira-muted"
          >
            powered by Kira
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
