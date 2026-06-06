"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gift,
  Loader2,
  MessageSquare,
  Share2,
  User,
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
  const prefersReduced = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState<Step>("review");
  const [delivery, setDelivery] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
  });
  const [giftMessage, setGiftMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [cardValid, setCardValid] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [modalCheckoutInfo, setModalCheckoutInfo] = useState<CheckoutInfo | undefined>();
  const checkoutUrl = modalCheckoutInfo?.checkoutUrl ?? payLink ?? contextPayLink;
  const stepIndex = STEPS.indexOf(step);

  // Focus trap — keep keyboard focus inside the modal
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open]);

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
    setGiftMessage("");
    setSenderName("");
    onClose();
  }

  function goBack() {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous);
    else handleClose();
  }

  async function goNext() {
    if (step === "review" && cart.length > 0) setStep("delivery");
    if (step === "delivery" && delivery.name.trim() && delivery.city.trim() && delivery.address.trim()) {
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
          body: JSON.stringify({ cart, delivery, giftMessage, senderName }),
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
            ref={dialogRef}
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
                    <h2 className="font-sans text-2xl text-kira-text">
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
                                  (item.product.price ?? 0) * item.quantity
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
                    <h2 className="font-sans text-2xl text-kira-text">
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
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-kira-muted">
                          <MessageSquare className="size-3" />
                          Gift message
                          <span className="ml-auto font-normal normal-case text-kira-muted/60">optional</span>
                        </label>
                        <textarea
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          placeholder="Happy birthday amma! Wishing you all the love 🎂"
                          rows={3}
                          maxLength={300}
                          className="w-full resize-none rounded-xl border border-kira-line bg-kira-surface px-4 py-3 text-sm text-kira-text outline-none transition-all placeholder:text-kira-muted focus:border-kap-purple/60 focus:ring-2 focus:ring-kap-purple/10"
                        />
                        {giftMessage.length > 0 && (
                          <p className="mt-0.5 text-right text-[10px] text-kira-muted">{giftMessage.length}/300</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-kira-muted">
                          <User className="size-3" />
                          From (your name)
                          <span className="ml-auto font-normal normal-case text-kira-muted/60">optional</span>
                        </label>
                        <input
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Leave blank to send anonymously"
                          className="w-full rounded-xl border border-kira-line bg-kira-surface px-4 py-3 text-sm text-kira-text outline-none transition-all placeholder:text-kira-muted focus:border-kap-purple/60 focus:ring-2 focus:ring-kap-purple/10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "payment" && (
                  <motion.div key="payment" {...slideProps} className="p-5">
                    <h2 className="font-sans text-2xl text-kira-text">
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
                    className="relative flex flex-col items-center gap-5 overflow-hidden p-8 text-center"
                  >
                    {/* Confetti burst — skipped for prefers-reduced-motion */}
                    {!prefersReduced && <ConfettiBlast />}

                    <motion.span
                      className="flex size-20 items-center justify-center rounded-full bg-kira-leaf/10"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    >
                      <Check className="size-10 text-kira-leaf" strokeWidth={2.5} />
                    </motion.span>
                    <div>
                      <h2 className="font-sans text-2xl text-kira-text">
                        🎉 Order placed!
                      </h2>
                      <p className="mt-1 text-sm text-kira-muted">
                        {giftMessage
                          ? `Your note — "${giftMessage.slice(0, 60)}${giftMessage.length > 60 ? "…" : ""}" — is attached.`
                          : "Complete your payment securely on Kapruka."}
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
                    {/* WhatsApp share — let the sender tell the family */}
                    {checkoutUrl && (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`I just sent you a gift via Kapruka! 🎁 Your order is on its way — track it here: ${checkoutUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-kira-line bg-kira-surface px-5 py-2.5 text-xs font-semibold text-kira-text transition-colors hover:bg-kira-bg"
                        aria-label="Share order on WhatsApp"
                      >
                        <Share2 className="size-3.5 text-green-500" />
                        Tell them it&apos;s coming — share on WhatsApp
                      </a>
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
                      (!delivery.name.trim() || !delivery.city.trim() || !delivery.address.trim())) ||
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

const CONFETTI_COLORS = ["#f8da08", "#402970", "#10b981", "#f43f5e", "#3b82f6", "#f97316"];
const CONFETTI_COUNT = 28;

function ConfettiBlast() {
  const particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (i / CONFETTI_COUNT) * 360 + (Math.random() * 30 - 15);
    const rad = (angle * Math.PI) / 180;
    const dist = 110 + Math.random() * 80;
    return {
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist,
      rotate: Math.random() * 720 - 360,
      scale: 0.4 + Math.random() * 0.6,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute size-2.5 rounded-sm"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: p.scale, rotate: p.rotate, opacity: 0 }}
          transition={{ duration: 0.8 + Math.random() * 0.4, ease: "easeOut", delay: i * 0.012 }}
        />
      ))}
    </div>
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
