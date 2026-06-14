"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import KiraExperience from "@/app/components/KiraExperience";

export default function KiraDock() {
  const pathname = usePathname();
  const { isOpen, open, close } = useKiraDock();

  // Don't show the dock on the standalone Kira page (it's already full-screen Kira).
  if (pathname?.startsWith("/kira")) return null;

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            onClick={open}
            aria-label="Open Kira, your shopping assistant"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full liquid-btn-accent py-2.5 pl-3.5 pr-4 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:bottom-6 sm:right-6"
          >
            <span className="relative flex size-6 items-center justify-center">
              <span className="kira-ring absolute inline-flex size-6 rounded-full bg-white/30" />
              <span className="relative flex size-6 items-center justify-center rounded-full bg-white/10">
                <Sparkles className="size-3.5 text-white/90" />
              </span>
            </span>
            <span className="text-[13px] font-semibold text-white">Ask Kira</span>
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
              className="liquid-glass-sheet fixed inset-y-0 right-0 z-[96] flex w-full flex-col overflow-hidden sm:w-[440px]"
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
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full liquid-glass-pill text-white/75"
              >
                <X className="size-4" />
              </button>
              <div className="min-h-0 flex-1">
                <KiraExperience embedded />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
