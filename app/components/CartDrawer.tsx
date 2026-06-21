"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Gift, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import CheckoutModal from "./CheckoutModal";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

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
    checkoutDefaults,
  } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (checkoutOpen) closeCart();
  }, [checkoutOpen, closeCart]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [closeCart, isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && !checkoutOpen && (
          <motion.div
            className="fixed inset-0 z-[80] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close gift tray"
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={closeCart}
            />

            {/* Drawer */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Gift tray"
              className="relative z-10 flex h-full w-full max-w-sm flex-col overflow-hidden"
              style={{ background: "#ffffff", fontFamily: SF }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 pb-4 pt-10">
                <div>
                  <h2
                    className="text-[28px] font-semibold leading-none tracking-tight text-kira-text"
                  >
                    Gift tray
                  </h2>
                  <p className="mt-1 text-[15px] text-kira-text-2">
                    {cartCount} item{cartCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  aria-label="Close"
                  className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-kira-border bg-[#f5f5f7] transition-colors hover:bg-[#ebebef]"
                >
                  <X className="size-4 text-kira-text-2" strokeWidth={2.5} />
                </button>
              </div>

              {/* Hairline separator */}
              <div style={{ height: "0.5px", background: "rgba(60,60,67,0.12)", marginInline: "24px" }} />

              {/* Items list */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                    <div className="flex size-[72px] items-center justify-center rounded-[20px] bg-[#f5f5f7]">
                      <ShoppingBag className="size-8 text-kira-muted" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[17px] font-semibold text-kira-text">Your tray is empty</p>
                      <p className="text-[15px] text-kira-text-2">Ask Kira to find the perfect gift.</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-2">
                    {cart.map((item, i) => (
                      <div key={item.product.id}>
                        {i > 0 && (
                          <div style={{ height: "0.5px", background: "rgba(84,84,88,0.65)", marginLeft: "76px" }} />
                        )}
                        <div className="flex gap-4 py-[14px]">
                          {/* Thumbnail */}
                          <div className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-[#f5f5f7]">
                            {item.product.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                fill
                                sizes="60px"
                                className="object-contain p-1.5"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Gift className="size-5 text-kira-muted" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-[15px] font-medium leading-snug text-kira-text">
                                {item.product.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                aria-label={`Remove ${item.product.name}`}
                                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-kira-border bg-[#f5f5f7] hover:bg-[#ebebef]"
                              >
                                <Trash2 className="size-3.5 text-kira-muted" />
                              </button>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between">
                              <p className="text-[15px] font-semibold text-kap-purple">
                                {lkrFormatter.format(item.product.price * item.quantity)}
                              </p>

                              {/* iOS-style stepper */}
                              <div className="flex items-center overflow-hidden rounded-full border border-kira-border bg-[#f5f5f7]">
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.product.id, item.quantity - 1)}
                                  aria-label={`Decrease quantity for ${item.product.name}`}
                                  className="flex size-9 items-center justify-center hover:bg-white"
                                >
                                  <Minus className="size-3.5 text-kira-text" strokeWidth={2.5} />
                                </button>
                                <span className="min-w-[26px] text-center text-[13px] font-semibold tabular-nums text-kira-text">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.product.id, item.quantity + 1)}
                                  aria-label={`Increase quantity for ${item.product.name}`}
                                  className="flex size-9 items-center justify-center hover:bg-white"
                                >
                                  <Plus className="size-3.5 text-kira-text" strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div
                  className="shrink-0 px-6 pb-10 pt-4"
                  style={{ borderTop: "0.5px solid rgba(60,60,67,0.12)" }}
                >
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[15px] text-kira-text-2">Subtotal</span>
                    <span className="text-[22px] font-semibold tracking-tight text-kira-text">
                      {lkrFormatter.format(cartTotal)}
                    </span>
                  </div>
                  <p className="mb-5 text-[13px] text-kira-muted">
                    Delivery fee confirmed by Kapruka based on city.
                  </p>

                  <button
                    type="button"
                    onClick={() => { closeCart(); setCheckoutOpen(true); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[16px] py-[17px] text-[17px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
                    style={{ background: "#402970" }}
                  >
                    Proceed to checkout
                    <ArrowRight className="size-[18px]" strokeWidth={2} />
                  </button>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        initialDelivery={checkoutDefaults}
      />
    </>
  );
}
