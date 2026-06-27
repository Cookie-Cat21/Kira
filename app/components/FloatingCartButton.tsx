"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export default function FloatingCartButton() {
  const pathname = usePathname();
  const { cartCount, cartTotal, isOpen, openCart, cartButtonRef, bagControls } =
    useCart();

  if (pathname === "/") return null;

  return (
    <AnimatePresence>
      {cartCount > 0 && !isOpen && (
        <motion.button
          ref={cartButtonRef}
          type="button"
          onClick={openCart}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-[70] flex items-center gap-3 rounded-full border border-kap-purple/20 bg-kira-paper px-4 py-2.5 shadow-xl transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:left-6"
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-label={`Open gift tray with ${cartCount} item${
            cartCount === 1 ? "" : "s"
          }`}
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-kira-bg shadow-sm">
            <motion.span
              animate={bagControls}
              className="flex items-center justify-center"
            >
              <ShoppingBag className="size-[18px] text-kap-purple" />
            </motion.span>
          </span>
          <span className="text-xs font-bold uppercase text-kira-text">
            {lkrFormatter.format(cartTotal)}
          </span>
          <motion.span
            key={cartCount}
            className="flex size-8 min-w-8 items-center justify-center rounded-full bg-kap-purple text-xs font-bold text-white shadow-sm"
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
