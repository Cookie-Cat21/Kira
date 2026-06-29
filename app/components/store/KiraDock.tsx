"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import KiraExperience from "@/app/components/KiraExperience";
import KiraOrb from "@/app/components/KiraOrb";

/** Apple-style spring — stiffness 300, damping 30 per ultra-skills design ref. */
const SHELL_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const OPEN_SPRING = { type: "spring" as const, stiffness: 320, damping: 34 };

export default function KiraDock() {
  const pathname = usePathname();
  const { isOpen, isExpanded, open, close, expand, collapse, seed, isThinking } =
    useKiraDock();

  const onRoot =
    pathname === "/" ||
    pathname?.startsWith("/kira") ||
    pathname?.startsWith("/liquid-glass");
  const hideLauncher = onRoot || pathname === "/shop";

  if (onRoot) return null;

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!isOpen && !hideLauncher && (
          <motion.button
            type="button"
            onClick={() => open()}
            aria-label={
              isThinking
                ? "Kira is thinking — open assistant"
                : "Open Kira, your shopping assistant"
            }
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="group fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-full border border-white/10 bg-[#0a0612]/90 p-1.5 pl-1.5 pr-5 shadow-[0_8px_32px_rgba(64,41,112,0.55)] backdrop-blur-md sm:bottom-6 sm:right-6"
          >
            <span className="relative flex size-[52px] items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full"
                animate={
                  isThinking
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(248,218,8,0.35)",
                          "0 0 0 10px rgba(248,218,8,0)",
                        ],
                      }
                    : { boxShadow: "0 0 0 0 rgba(148,100,255,0)" }
                }
                transition={
                  isThinking
                    ? { duration: 1.4, repeat: Infinity, ease: "easeOut" }
                    : { duration: 0.3 }
                }
              />
              <span
                className={
                  isThinking
                    ? "kira-ring absolute inset-0 rounded-full bg-kap-yellow/25"
                    : "kira-ring absolute inset-0 rounded-full bg-white/20 opacity-70"
                }
              />
              <KiraOrb size={52} />
            </span>
            <span className="text-sm font-semibold text-white/95">
              {isThinking ? "Kira is thinking…" : "Ask Kira"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating glass panel — expands to full viewport on demand */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-label="Kira assistant"
              className="fixed z-[96] flex flex-col overflow-hidden"
              initial={{
                opacity: 0,
                scale: 0.93,
                y: 32,
                top: "8%",
                left: "4%",
                right: "4%",
                bottom: "8%",
              }}
              animate={
                isExpanded
                  ? {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      top: "5%",
                      left: "3.5%",
                      right: "3.5%",
                      bottom: "5%",
                    }
              }
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={isExpanded ? SHELL_SPRING : OPEN_SPRING}
              style={{ originX: 1, originY: 1 }}
            >
              <motion.div
                className={`relative flex h-full min-h-0 flex-col overflow-hidden ${isExpanded ? "" : "rounded-[32px] shadow-2xl"}`}
                layout
                transition={SHELL_SPRING}
              >
                {/* Chrome — expand / close */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-end gap-1.5 p-3">
                  <button
                    type="button"
                    onClick={isExpanded ? collapse : expand}
                    aria-label={isExpanded ? "Exit full screen" : "Expand to full screen"}
                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/85 shadow-lg backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white"
                  >
                    {isExpanded ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close Kira"
                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/85 shadow-lg backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <KiraExperience embedded seed={seed} />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
