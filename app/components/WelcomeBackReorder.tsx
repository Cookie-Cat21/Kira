"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import { hasFullReorderContext, lastOrderLabel } from "@/lib/reorder";

const DISMISS_KEY = "kira_welcome_reorder_dismissed";

export default function WelcomeBackReorder() {
  const { cartCount, lastOrder, beginReorder } = useCart();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed || cartCount > 0 || !lastOrder || !hasFullReorderContext(lastOrder)) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(t);
  }, [cartCount, dismissed, lastOrder]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (!lastOrder || !hasFullReorderContext(lastOrder)) return null;

  const label = lastOrderLabel(lastOrder);
  const city = lastOrder.delivery?.city ?? "Colombo";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-auto mb-3 flex max-w-lg items-center gap-3 rounded-2xl border border-kap-purple/25 bg-kap-purple/10 px-4 py-3 text-sm shadow-sm backdrop-blur-sm"
          role="region"
          aria-label="Welcome back reorder suggestion"
        >
          <button
            type="button"
            onClick={() => beginReorder(lastOrder)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-kira-text transition-opacity hover:opacity-90"
          >
            <RotateCcw className="size-4 shrink-0 text-kap-purple" />
            <span>
              Welcome back — reorder <strong>{label}</strong> to {city}?
            </span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss reorder suggestion"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-kira-muted hover:bg-kira-bg hover:text-kira-text"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
