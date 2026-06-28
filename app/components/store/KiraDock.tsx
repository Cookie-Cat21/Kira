"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import KiraExperience from "@/app/components/KiraExperience";

export default function KiraDock() {
  const pathname = usePathname();
  const { isOpen, open, close, seed } = useKiraDock();

  // The root route IS the full-screen Kira experience — the dock only exists
  // on storefront pages (/shop, /product) as a way back into the conversation.
  // /liquid-glass is a standalone material demo and stays uncluttered.
  if (
    pathname === "/" ||
    pathname?.startsWith("/kira") ||
    pathname?.startsWith("/liquid-glass")
  )
    return null;

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            onClick={() => open()}
            aria-label="Open Kira, your shopping assistant"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] py-3 pl-4 pr-5 shadow-[0_8px_30px_rgba(64,41,112,0.6)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
          >
            <span className="relative flex size-7 items-center justify-center">
              <span className="kira-ring absolute inline-flex size-7 rounded-full bg-white/40" />
              <span className="relative flex size-7 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="size-4 text-kap-yellow" />
              </span>
            </span>
            <span className="text-sm font-semibold text-white">Ask Kira</span>
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
