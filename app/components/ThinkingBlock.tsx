"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

// Steps Kira works through on every message
const STEPS = [
  { id: "understand", label: "Understanding your message", ms: 0 },
  { id: "search", label: "Searching Kapruka catalog", ms: 600 },
  { id: "delivery", label: "Checking delivery availability", ms: 1400 },
  { id: "prepare", label: "Preparing response", ms: 2200 },
];

type StepStatus = "pending" | "active" | "done";

/* ── Loading state — shown while waiting for API response ── */
function ThinkingLive() {
  const [stepStates, setStepStates] = useState<Record<string, StepStatus>>(
    Object.fromEntries(STEPS.map((s) => [s.id, "pending"]))
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      // Activate this step
      timers.push(
        setTimeout(() => {
          setStepStates((prev) => ({ ...prev, [step.id]: "active" }));
        }, step.ms)
      );
      // Mark previous step done when next activates
      if (i > 0) {
        timers.push(
          setTimeout(() => {
            setStepStates((prev) => ({ ...prev, [STEPS[i - 1].id]: "done" }));
          }, step.ms)
        );
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex items-start gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-kap-purple flex items-center justify-center shrink-0 text-xs text-kap-yellow shadow-sm mt-0.5">
        ✦
      </div>

      <div className="flex-1 max-w-[88%]">
        {/* Thinking header */}
        <div className="bg-kira-bg border border-kira-border rounded-2xl rounded-bl-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-kira-border">
            {/* Pulsing dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kap-purple opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-kap-purple" />
            </span>
            <span className="text-xs font-semibold text-kap-purple">
              Kira is thinking…
            </span>
          </div>

          {/* Steps */}
          <div className="px-4 py-3 space-y-2">
            {STEPS.map((step) => {
              const status = stepStates[step.id];
              return (
                <motion.div
                  key={step.id}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: status === "pending" ? 0.3 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Status dot */}
                  <span className="shrink-0 w-4 flex justify-center">
                    {status === "done" ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-emerald-500 text-xs"
                      >
                        ✓
                      </motion.span>
                    ) : status === "active" ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-kap-purple animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-kira-border" />
                    )}
                  </span>
                  <span
                    className={`text-xs ${
                      status === "pending"
                        ? "text-kira-muted"
                        : status === "active"
                        ? "text-kap-purple font-medium"
                        : "text-kira-text line-through decoration-kira-muted/50"
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsed summary — shown attached to a completed message ── */
interface ThinkingDoneProps {
  thinkingMs: number;
}

function ThinkingDone({ thinkingMs }: ThinkingDoneProps) {
  const [open, setOpen] = useState(false);
  const seconds = (thinkingMs / 1000).toFixed(1);

  return (
    <div className="mb-2 ml-9">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-kira-muted hover:text-kap-purple transition-colors group"
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="group-hover:underline underline-offset-2">
          Thought for {seconds}s
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] }}
            className="overflow-hidden mt-2"
          >
            <div className="bg-kira-bg border border-kira-border rounded-xl px-4 py-3 space-y-2">
              {STEPS.map((step) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-emerald-500 text-xs w-4 text-center">✓</span>
                  <span className="text-xs text-kira-muted line-through decoration-kira-muted/40">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Public exports ── */
export { ThinkingLive, ThinkingDone };
