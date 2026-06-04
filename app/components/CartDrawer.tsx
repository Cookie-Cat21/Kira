"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Gift,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import CheckoutModal from "./CheckoutModal";

const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export default function CartDrawer() {
  const {
    cart,
    cartTotal,
    cartCount,
    isOpen,
    closeCart,
    removeFromCart,
    updateQty,
  } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (checkoutOpen) closeCart();
  }, [checkoutOpen, closeCart]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCart, isOpen]);

  return (
    <>
      {isOpen && !checkoutOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex justify-end"
          initial={false}
        >
          <motion.button
            type="button"
            aria-label="Close gift tray"
            className="absolute inset-0 bg-kira-text/50 backdrop-blur-sm"
            onClick={closeCart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Gift tray"
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-kira-line bg-kira-paper shadow-2xl"
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
              <header className="flex items-center justify-between border-b border-kira-line px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-kap-yellow text-gray-950">
                    <ShoppingBag className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg leading-tight text-kira-text">
                      Gift tray
                    </h2>
                    <p className="text-[11px] text-kira-muted">
                      {cartCount} item{cartCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  aria-label="Close gift tray"
                  className="flex size-8 items-center justify-center rounded-lg text-kira-muted transition-colors hover:bg-kira-bg hover:text-kira-text"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-kira-bg text-kira-muted">
                      <Gift className="size-7" />
                    </div>
                    <p className="text-sm font-semibold text-kira-text">
                      Your tray is empty
                    </p>
                    <p className="text-xs text-kira-muted">
                      Ask Kira to find the perfect gift.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-kira-line">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex gap-3 py-4">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-kira-line bg-kira-bg">
                          {item.product.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              sizes="64px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-kira-muted">
                              <Gift className="size-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-kira-text">
                            {item.product.name}
                          </p>
                          <p className="mt-1 text-sm font-bold text-kap-purple">
                            {lkrFormatter.format(
                              item.product.price * item.quantity
                            )}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateQty(item.product.id, item.quantity - 1)
                              }
                              aria-label={`Decrease quantity for ${item.product.name}`}
                              className="flex size-7 items-center justify-center rounded-md border border-kira-line bg-white text-kira-text transition-colors hover:border-kap-purple/40"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-kira-text">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQty(item.product.id, item.quantity + 1)
                              }
                              aria-label={`Increase quantity for ${item.product.name}`}
                              className="flex size-7 items-center justify-center rounded-md border border-kira-line bg-white text-kira-text transition-colors hover:border-kap-purple/40"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={`Remove ${item.product.name}`}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-kira-muted transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <footer className="shrink-0 space-y-3 border-t border-kira-line bg-kira-paper px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-kira-muted">Subtotal</span>
                    <span className="font-bold text-kira-text">
                      {lkrFormatter.format(cartTotal)}
                    </span>
                  </div>
                  <p className="text-[11px] text-kira-muted">
                    Delivery fee is confirmed by Kapruka based on city.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCart();
                      setCheckoutOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-kap-purple py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-kap-purple/90 active:scale-[0.98]"
                  >
                    Proceed to checkout
                    <ArrowRight className="size-4" />
                  </button>
                </footer>
              )}
          </motion.aside>
        </motion.div>
      )}

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
