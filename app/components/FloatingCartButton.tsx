"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/app/context/CartContext";

const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export default function FloatingCartButton() {
  const { cartCount, cartTotal, isOpen, openCart, cartButtonRef, bagControls } =
    useCart();

  return (
    <AnimatePresence>
      {cartCount > 0 && !isOpen && (
        <motion.button
          ref={cartButtonRef}
          type="button"
          onClick={openCart}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-[70] flex items-center gap-2.5 rounded-full liquid-glass px-3.5 py-2 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:bottom-6 sm:left-6"
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-label={`Open gift tray with ${cartCount} item${
            cartCount === 1 ? "" : "s"
          }`}
        >
          <span className="relative flex size-8 items-center justify-center rounded-full liquid-glass-pill">
            <motion.span
              animate={bagControls}
              className="flex items-center justify-center"
            >
              <ShoppingBag className="size-4 text-white/75" />
            </motion.span>
          </span>
          <span className="text-xs font-semibold tracking-tight text-white/85">
            {lkrFormatter.format(cartTotal)}
          </span>
          <motion.span
            key={cartCount}
            className="flex size-7 min-w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#0a0712]"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {cartCount}
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
