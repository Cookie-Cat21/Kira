"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import KiraExperience from "@/app/components/KiraExperience";
import KiraOrb from "@/app/components/KiraOrb";

export default function KiraDock() {
  const pathname = usePathname();
  const { isOpen, open, close, seed, isThinking } = useKiraDock();

  // The root route IS the full-screen Kira experience — the dock only exists
  // on storefront pages (/shop, /product) as a way back into the conversation.
  // /liquid-glass is a standalone material demo and stays uncluttered.
  const onRoot =
    pathname === "/" ||
    pathname?.startsWith("/kira") ||
    pathname?.startsWith("/liquid-glass");
  const hideLauncher = onRoot || pathname === "/shop";

  if (onRoot) return null;

  return (
    <>
      {/* Floating launcher — hidden on /shop landing (hero has Ask Kira CTA) */}
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
              <KiraOrb thinking={isThinking} size={52} />
            </span>
            <span className="text-sm font-semibold text-white/95">
              {isThinking ? "Kira is thinking…" : "Ask Kira"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[96] flex w-full flex-col overflow-hidden border-l border-white/10 shadow-2xl sm:w-[440px]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              role="dialog"
              aria-label="Kira assistant"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close Kira"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur transition-colors hover:bg-white/20"
              >
                <X className="size-4" />
              </button>
              <div className="min-h-0 flex-1">
                <KiraExperience embedded seed={seed} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
