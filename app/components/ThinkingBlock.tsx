"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import McpThinkingFlow from "./McpThinkingFlow";
import { ProductCardSkeleton } from "./ProductCard";
import { ShiningText } from "./ui/shining-text";

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
    <div className="mb-4 flex items-start gap-2.5 animate-fade-up">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-kap-purple/15 bg-kap-purple/10 text-kap-purple">
        <Sparkles className="size-4" />
      </div>

      <div className="max-w-[88%] flex-1 pt-1.5">
        <McpThinkingFlow activeStep={steps[steps.length - 1]} />

        <div className="mb-2 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kap-purple/40 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-kap-purple" />
          </span>
          <ShiningText
            text="Kira is thinking…"
            className="bg-[linear-gradient(110deg,rgba(64,41,112,0.25),35%,rgba(64,41,112,0.95),50%,rgba(64,41,112,0.25),75%,rgba(64,41,112,0.25))] bg-[length:200%_100%] bg-clip-text text-xs font-medium text-transparent"
          />
          {elapsed > 0 && (
            <span className="text-[10px] tabular-nums text-kira-muted">{elapsed}s</span>
          )}
        </div>

        {steps.length > 0 && (
          <div className="space-y-1.5 border-l-2 border-kap-purple/20 pl-3">
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
                      <Check className="size-2.5 shrink-0 text-emerald-600" />
                    ) : isActive ? (
                      <span className="size-1 shrink-0 animate-pulse rounded-full bg-kap-purple/60" />
                    ) : null}
                    <span
                      className={`text-[11px] leading-snug ${
                        isDone
                          ? "text-kira-muted line-through decoration-kira-border"
                          : "text-kira-text-2"
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
        className={`group flex items-center gap-1 text-[11px] text-kira-muted transition-colors ${
          hasSteps ? "cursor-pointer hover:text-kira-text-2" : "cursor-default"
        }`}
      >
        {hasSteps &&
          (open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          ))}
        <span className={hasSteps ? "group-hover:text-kira-text-2" : ""}>
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
              <div className="space-y-1.5 border-l-2 border-kira-border py-0.5 pl-3 pt-2">
                {steps!.map((label, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="size-2.5 shrink-0 text-emerald-600/70" />
                    <span className="text-[11px] leading-snug text-kira-muted line-through decoration-kira-border">
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
