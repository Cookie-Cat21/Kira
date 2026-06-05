"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gift,
  Loader2,
  X,
} from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import {
  CreditCardForm,
  type CardState,
  type CardValidity,
} from "./ui/credit-card-form";
import { cn } from "@/lib/utils";
import type { CheckoutInfo } from "@/types";

const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

type Step = "review" | "delivery" | "payment" | "confirm";

const STEPS: Step[] = ["review", "delivery", "payment", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  review: "Review",
  delivery: "Delivery",
  payment: "Payment",
  confirm: "Confirm",
};

const slideProps = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  payLink?: string;
}

export default function CheckoutModal({
  open,
  onClose,
  payLink,
}: CheckoutModalProps) {
  const { cart, cartTotal, clearCart, payLink: contextPayLink } = useCart();
  const [step, setStep] = useState<Step>("review");
  const [delivery, setDelivery] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
  });
  const [cardValid, setCardValid] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [modalCheckoutInfo, setModalCheckoutInfo] = useState<CheckoutInfo | undefined>();
  const checkoutUrl = modalCheckoutInfo?.checkoutUrl ?? payLink ?? contextPayLink;
  const stepIndex = STEPS.indexOf(step);

  const handleCardChange = useCallback(
    (_state: CardState, validity: CardValidity) => {
      setCardValid(validity.allValid);
    },
    []
  );

  function handleClose() {
    setStep("review");
    setCardValid(false);
    setPlaceError("");
    setModalCheckoutInfo(undefined);
    onClose();
  }

  function goBack() {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous);
    else handleClose();
  }

  async function goNext() {
    if (step === "review" && cart.length > 0) setStep("delivery");
    if (step === "delivery" && delivery.name.trim() && delivery.city.trim()) {
      setStep("payment");
    }
    if (step === "payment" && cardValid) {
      // Call the checkout API directly — no LLM round-trip needed.
      setPlacing(true);
      setPlaceError("");
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, delivery }),
        });
        const data = (await res.json()) as { checkoutInfo?: CheckoutInfo; error?: string };
        if (!res.ok || !data.checkoutInfo) {
          setPlaceError(data.error ?? "Couldn't place the order — try again.");
          return;
        }
        setModalCheckoutInfo(data.checkoutInfo);
        setStep("confirm");
      } catch {
        setPlaceError("Network error — check your connection and try again.");
      } finally {
        setPlacing(false);
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={false}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-kira-text/60 backdrop-blur-md"
            aria-label="Close checkout"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
            className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-kira-line bg-kira-paper shadow-2xl"
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-kira-line px-5 py-4">
              <div className="flex items-center gap-2">
                {STEPS.map((item, index) => (
                  <div key={item} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                        index < stepIndex && "bg-kira-leaf text-white",
                        index === stepIndex && "bg-kap-purple text-white",
                        index > stepIndex && "bg-kira-bg text-kira-muted"
                      )}
                    >
                      {index < stepIndex ? (
                        <Check className="size-3" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "hidden text-xs font-semibold sm:block",
                        index === stepIndex ? "text-kira-text" : "text-kira-muted"
                      )}
                    >
                      {STEP_LABELS[item]}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span className="hidden h-px w-4 bg-kira-line sm:block" />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close checkout"
                className="flex size-8 items-center justify-center rounded-lg text-kira-muted transition-colors hover:bg-kira-bg hover:text-kira-text"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === "review" && (
                  <motion.div key="review" {...slideProps} className="p-5">
                    <h2 className="font-display text-2xl text-kira-text">
                      Review your tray
                    </h2>
                    {cart.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-kira-line bg-white p-6 text-center">
                        <Gift className="mx-auto size-8 text-kira-muted" />
                        <p className="mt-2 text-sm font-semibold text-kira-text">
                          Your tray is empty
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 divide-y divide-kira-line rounded-xl border border-kira-line bg-kira-surface">
                        {cart.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center gap-3 p-3"
                          >
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-kira-bg">
                              {item.product.image ? (
                                <Image
                                  src={item.product.image}
                                  alt={item.product.name}
                                  fill
                                  sizes="48px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                <Gift className="m-3 size-6 text-kira-muted" />
                              )}
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-kira-text">
                              {item.product.name}
                            </p>
                            <div className="shrink-0 text-right">
                              <p className="text-xs text-kira-muted">
                                x{item.quantity}
                              </p>
                              <p className="text-sm font-bold text-kap-purple">
                                {lkrFormatter.format(
                                  item.product.price * item.quantity
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between p-3 font-bold">
                          <span className="text-sm text-kira-text">Subtotal</span>
                          <span className="text-base text-kira-text">
                            {lkrFormatter.format(cartTotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === "delivery" && (
                  <motion.div
                    key="delivery"
                    {...slideProps}
                    className="space-y-4 p-5"
                  >
                    <h2 className="font-display text-2xl text-kira-text">
                      Delivery details
                    </h2>
                    <div className="grid gap-3">
                      <DeliveryField
                        label="Recipient name"
                        required
                        value={delivery.name}
                        placeholder="Amali Perera"
                        onChange={(name) =>
                          setDelivery((current) => ({ ...current, name }))
                        }
                      />
                      <DeliveryField
                        label="Phone number"
                        value={delivery.phone}
                        placeholder="077 123 4567"
                        onChange={(phone) =>
                          setDelivery((current) => ({ ...current, phone }))
                        }
                      />
                      <DeliveryField
                        label="City"
                        required
                        value={delivery.city}
                        placeholder="Colombo"
                        onChange={(city) =>
                          setDelivery((current) => ({ ...current, city }))
                        }
                      />
                      <DeliveryField
                        label="Street address"
                        value={delivery.address}
                        placeholder="No. 12, Flower Road"
                        onChange={(address) =>
                          setDelivery((current) => ({ ...current, address }))
                        }
                      />
                    </div>
                  </motion.div>
                )}

                {step === "payment" && (
                  <motion.div key="payment" {...slideProps} className="p-5">
                    <h2 className="font-display text-2xl text-kira-text">
                      Payment
                    </h2>
                    <p className="mb-4 mt-2 rounded-lg border border-amber-500/30 bg-amber-900/30 px-3 py-2 text-xs leading-5 text-amber-300">
                      Kira will place the order through Kapruka&apos;s secure
                      checkout. Card details are validated in the browser only —
                      payment is completed on Kapruka&apos;s site.
                    </p>
                    {placeError && (
                      <p className="mb-3 rounded-lg border border-red-500/30 bg-red-900/30 px-3 py-2 text-xs text-red-300">
                        {placeError}
                      </p>
                    )}
                    <CreditCardForm
                      ring1="#402970"
                      ring2="#f8da08"
                      showSubmit={false}
                      onChange={handleCardChange}
                      className="bg-transparent p-0"
                    />
                  </motion.div>
                )}

                {step === "confirm" && (
                  <motion.div
                    key="confirm"
                    {...slideProps}
                    className="flex flex-col items-center gap-5 p-8 text-center"
                  >
                    <span className="flex size-20 items-center justify-center rounded-full bg-kira-leaf/10">
                      <Check className="size-10 text-kira-leaf" strokeWidth={2.5} />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl text-kira-text">
                        All set
                      </h2>
                      <p className="mt-1 text-sm text-kira-muted">
                        Complete your payment securely on Kapruka.
                      </p>
                    </div>
                    {checkoutUrl ? (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          clearCart();
                          handleClose();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-kap-yellow px-8 py-4 text-sm font-bold text-gray-950 shadow-md transition-all hover:brightness-95 active:scale-[0.98]"
                      >
                        Complete payment on Kapruka
                        <ExternalLink className="size-4" />
                      </a>
                    ) : (
                      <p className="max-w-sm rounded-xl border border-kira-line bg-kira-surface px-4 py-3 text-xs leading-5 text-kira-text-2">
                        Ask Kira &quot;I&apos;m ready to checkout&quot; to
                        generate your secure Kapruka payment link.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-kira-line bg-kira-paper px-5 py-4">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-kira-muted transition-colors hover:text-kira-text"
              >
                <ChevronLeft className="size-4" />
                {stepIndex === 0 ? "Cancel" : "Back"}
              </button>

              {step !== "confirm" && (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={
                    placing ||
                    (step === "review" && cart.length === 0) ||
                    (step === "delivery" &&
                      (!delivery.name.trim() || !delivery.city.trim())) ||
                    (step === "payment" && !cardValid)
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-kap-purple px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-kap-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {placing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Placing order…
                    </>
                  ) : step === "payment" ? (
                    <>
                      Place order
                      <ChevronRight className="size-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="size-4" />
                    </>
                  )}
                </button>
              )}
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeliveryField({
  label,
  value,
  placeholder,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-kira-muted">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-kira-line bg-kira-surface px-4 py-3 text-sm text-kira-text outline-none transition-all placeholder:text-kira-muted focus:border-kap-purple/60 focus:ring-2 focus:ring-kap-purple/10"
      />
    </label>
  );
}
