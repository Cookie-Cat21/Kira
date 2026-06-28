"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProductCardSkeleton } from "./ProductCard";
import { ShiningText } from "./ui/shining-text";

/* ── Live indicator — shown while API is streaming ── */
interface ThinkingLiveProps {
  steps: string[];
  showProductSkeleton?: boolean;
}

export function ThinkingLive({ steps, showProductSkeleton = false }: ThinkingLiveProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const startedAt = startRef.current ?? Date.now();
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-start gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs text-kap-yellow"
        style={{
          background: "rgba(64,41,112,0.5)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(248,218,8,0.2)",
        }}
      >
        <Sparkles className="size-4" />
      </div>

      <div className="flex-1 max-w-[88%] pt-1.5">
        {/* Shining "Kira is thinking…" label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-400" />
          </span>
          <ShiningText text="Kira is thinking…" className="bg-[linear-gradient(110deg,rgba(255,255,255,0.2),35%,rgba(200,180,255,0.95),50%,rgba(255,255,255,0.2),75%,rgba(255,255,255,0.2))] bg-[length:200%_100%] bg-clip-text text-xs font-medium text-transparent" />
          {elapsed > 0 && (
            <span className="text-[10px] tabular-nums text-white/25">{elapsed}s</span>
          )}
        </div>

        {/* Steps — left-bordered, no box */}
        {steps.length > 0 && (
          <div
            className="pl-3 space-y-1.5"
            style={{ borderLeft: "2px solid rgba(156,132,198,0.3)" }}
          >
            <AnimatePresence initial={false}>
              {steps.map((label, i) => {
                const isDone = i < steps.length - 1;
                const isActive = i === steps.length - 1;
                return (
                  <motion.div
                    key={label + i}
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isDone ? (
                      <Check className="size-2.5 shrink-0 text-emerald-500/70" />
                    ) : isActive ? (
                      <span className="size-1 rounded-full bg-purple-300/60 shrink-0 animate-pulse" />
                    ) : null}
                    <span
                      className={`text-[11px] leading-snug ${
                        isDone
                          ? "text-white/25 line-through decoration-white/15"
                          : "text-white/55"
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
          <div className="mt-3">
            <div className="flex gap-3 overflow-hidden" aria-label="Loading product suggestions">
              {[0, 1, 2].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Collapsed summary — attached to a completed message ── */
interface ThinkingDoneProps {
  thinkingMs: number;
  steps?: string[];
  summary?: string;
}

export function ThinkingDone({ thinkingMs, steps, summary }: ThinkingDoneProps) {
  const [open, setOpen] = useState(false);
  const rawS = thinkingMs / 1000;
  const seconds = rawS >= 10 ? Math.round(rawS).toString() : rawS.toFixed(1);
  const hasSteps = steps && steps.length > 0;

  return (
    <div className="mb-2 ml-10">
      <button
        onClick={() => hasSteps && setOpen((o) => !o)}
        className={`flex items-center gap-1 text-[11px] text-white/30 transition-colors group ${
          hasSteps ? "hover:text-white/50 cursor-pointer" : "cursor-default"
        }`}
      >
        {hasSteps &&
          (open ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          ))}
        <span className={hasSteps ? "group-hover:text-white/50" : ""}>
          Thought for {seconds}s
          {summary
            ? ` · ${summary}`
            : hasSteps
            ? ` · ${steps!.length} step${steps!.length > 1 ? "s" : ""}`
            : ""}
        </span>
      </button>

      {hasSteps && (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0.65, 0.3, 0.9] }}
              className="overflow-hidden"
            >
              <div
                className="pt-2 pb-0.5 pl-3 space-y-1.5"
                style={{ borderLeft: "2px solid rgba(156,132,198,0.2)" }}
              >
                {steps!.map((label, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="size-2.5 shrink-0 text-emerald-500/50" />
                    <span className="text-[11px] text-white/25 line-through decoration-white/10 leading-snug">
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
