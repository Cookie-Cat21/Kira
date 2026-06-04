"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { ProductCardSkeleton } from "./ProductCard";

/* ── Live indicator — shown while API is streaming ── */
interface ThinkingLiveProps {
  steps: string[]; // real-time steps received from SSE so far
  showProductSkeleton?: boolean;
}

export function ThinkingLive({ steps, showProductSkeleton = false }: ThinkingLiveProps) {
  return (
    <div className="flex items-start gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-kap-purple text-xs text-kap-yellow shadow-sm">
        <Sparkles className="size-4" />
      </div>

      <div className="flex-1 max-w-[88%]">
        <div className="overflow-hidden rounded-lg border border-kira-line bg-kira-bg">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-kira-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kap-purple opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-kap-purple" />
            </span>
            <span className="text-xs font-semibold text-kap-purple">
              Kira is thinking…
            </span>
          </div>

          {/* Steps — only rendered when at least one has arrived */}
          {steps.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <AnimatePresence initial={false}>
                {steps.map((label, i) => {
                  const isDone = i < steps.length - 1;
                  const isActive = i === steps.length - 1;
                  return (
                    <motion.div
                      key={label + i}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="shrink-0 w-4 flex justify-center">
                        {isDone ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-emerald-500"
                          >
                            <Check className="size-3" />
                          </motion.span>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-kap-purple animate-pulse" />
                        ) : null}
                      </span>
                      <span
                        className={`text-xs ${
                          isDone
                            ? "text-kira-muted line-through decoration-kira-muted/40"
                            : "text-kap-purple font-medium"
                        }`}
                      >
                        {label}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {showProductSkeleton && (
            <div className="px-4 pb-4 pt-1">
              <div
                className="flex gap-3 overflow-hidden"
                aria-label="Loading product suggestions"
              >
                {[0, 1, 2].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Collapsed summary — attached to a completed message ── */
interface ThinkingDoneProps {
  thinkingMs: number;
  steps?: string[];
}

export function ThinkingDone({ thinkingMs, steps }: ThinkingDoneProps) {
  const [open, setOpen] = useState(false);
  const seconds = (thinkingMs / 1000).toFixed(1);
  const hasSteps = steps && steps.length > 0;

  return (
    <div className="mb-2 ml-9">
      <button
        onClick={() => hasSteps && setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs text-kira-muted transition-colors group ${
          hasSteps ? "hover:text-kap-purple cursor-pointer" : "cursor-default"
        }`}
      >
        {hasSteps ? (
          open ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )
        ) : null}
        <span className={hasSteps ? "group-hover:underline underline-offset-2" : ""}>
          Thought for {seconds}s
          {hasSteps && ` · ${steps!.length} step${steps!.length > 1 ? "s" : ""}`}
        </span>
      </button>

      {hasSteps && (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] }}
              className="overflow-hidden mt-2"
            >
              <div className="space-y-2 rounded-lg border border-kira-line bg-kira-bg px-4 py-3">
                {steps!.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex w-4 justify-center text-emerald-500">
                      <Check className="size-3" />
                    </span>
                    <span className="text-xs text-kira-muted line-through decoration-kira-muted/40">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
