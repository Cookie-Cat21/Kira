"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentType,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CakeSlice,
  Flower2,
  Gift,
  Package,
  Shirt,
  ShoppingBag,
  Smartphone,
  Truck,
} from "lucide-react";
import KiraLoader from "./components/KiraLoader";
import McpStatusBadge from "./components/McpStatusBadge";
import ChatMessage from "./components/ChatMessage";
import ProductQuickView from "./components/ProductQuickView";
import { ThinkingLive, ThinkingDone } from "./components/ThinkingBlock";
import KiraChatInput from "./components/ui/kira-chat-input";
import { useCart } from "./context/CartContext";
import { getContextualGreeting, getOccasionChips } from "@/lib/kira-client";
import type {
  CheckoutInfo,
  DeliveryQuote,
  KiraMessage,
  KiraProduct,
  OrderTracking,
} from "@/types";
import { cn } from "@/lib/utils";

const OCCASION_CHIPS = getOccasionChips();
const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

type KiraIcon = ComponentType<{ className?: string }>;

// Fast-path city hint — server will canonicalise via kapruka_list_delivery_cities
const CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

const CATEGORIES: {
  icon: KiraIcon;
  label: string;
  value: string;
  tone: string;
}[] = [
  {
    icon: CakeSlice,
    label: "Cakes",
    value: "Show me gift-ready cakes on Kapruka",
    tone: "border-rose-100 bg-rose-50 text-rose-800",
  },
  {
    icon: Flower2,
    label: "Flowers",
    value: "I want to send fresh flowers",
    tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  {
    icon: Gift,
    label: "Chocolates",
    value: "Show me chocolate gifts and sweet boxes",
    tone: "border-orange-100 bg-orange-50 text-orange-900",
  },
  {
    icon: Smartphone,
    label: "Electronics",
    value: "Show me electronics gifts on Kapruka",
    tone: "border-sky-100 bg-sky-50 text-sky-800",
  },
  {
    icon: Shirt,
    label: "Fashion",
    value: "Show me fashion gifts on Kapruka",
    tone: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800",
  },
  {
    icon: Package,
    label: "Hampers",
    value: "Show me gift hampers",
    tone: "border-amber-100 bg-amber-50 text-amber-900",
  },
];

function stripDecorativeGlyphs(text: string) {
  return text.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function formatLKR(amount: number) {
  return currencyFormatter.format(amount);
}

function buildOpeningMessage(): KiraMessage {
  const greeting = stripDecorativeGlyphs(getContextualGreeting());
  return {
    id: "opening",
    role: "assistant",
    content: `${greeting} Tell me who it is for, your budget, and where it needs to go.`,
    timestamp: Date.now(),
  };
}

function KaprukaSmileMark() {
  return (
    <svg
      viewBox="326 40 114 58"
      className="mx-auto mb-5 h-auto w-28 sm:w-36"
      data-testid="kapruka-smile-mark"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#f8da08"
        d="M402.986267,67.193703 C411.020386,61.704575 416.238495,54.617882 418.415070,45.324123 C424.890198,45.324123 431.318146,45.324123 437.750275,45.324123 C437.129608,66.508202 416.547272,90.716156 386.719543,92.762413 C356.255249,94.852348 331.226654,71.531693 328.261810,45.118824 C334.079407,45.118824 339.857269,44.962524 345.612488,45.253811 C346.731842,45.310467 348.364868,46.921478 348.743073,48.133221 C353.218384,62.471653 368.281891,74.652725 385.670837,72.854988 C391.454773,72.257019 396.988068,69.234306 402.986267,67.193703 z"
      />
    </svg>
  );
}

export default function KiraChat() {
  const [appReady, setAppReady] = useState(false);
  const [messages, setMessages] = useState<KiraMessage[]>([
    buildOpeningMessage(),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>();
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [deliveryDate] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<KiraProduct | null>(null);
  const {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    openCart,
    cartButtonRef,
    bagControls,
    setPayLink,
  } = useCart();
  const thinkingStartRef = useRef<number>(0);
  const streamingMsgIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  // Buffer structured events that arrive before the first token creates the message
  const pendingDeliveryRef = useRef<DeliveryQuote | null>(null);
  const pendingTrackingRef = useRef<OrderTracking | null>(null);
  const pendingCheckoutRef = useRef<CheckoutInfo | null>(null);
  const pendingProductsRef = useRef<KiraProduct[] | null>(null);
  const pendingStepSummaryRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleAddToCart = useCallback(
    (product: KiraProduct) => {
      addToCart(product);
    },
    [addToCart]
  );

  const cancelActiveResponse = useCallback(() => {
    if (!isLoading || cancelledRef.current) return;
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamingMsgIdRef.current = null;
    pendingDeliveryRef.current = null;
    pendingTrackingRef.current = null;
    pendingCheckoutRef.current = null;
    pendingProductsRef.current = null;
    setLiveSteps([]);
    setIsLoading(false);
    setIsStreaming(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        role: "assistant",
        content: "Okay, I stopped there. We can pick it back up from here.",
        timestamp: Date.now(),
      },
    ]);
  }, [isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: KiraMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsStreaming(false);
      setLiveSteps([]);
      cancelledRef.current = false;
      streamingMsgIdRef.current = null;
      pendingDeliveryRef.current = null;
      pendingTrackingRef.current = null;
      pendingCheckoutRef.current = null;
      pendingProductsRef.current = null;
      thinkingStartRef.current = Date.now();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (!deliveryCity) {
        const m = trimmed.match(CITY_REGEX);
        if (m) {
          const city = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
          setDeliveryCity(city);
        }
      }

      try {
        const history = [...messages, userMsg]
          .filter((m) => m.id !== "opening")
          .map((m) => ({ role: m.role, content: m.content }));

        const allMsgs = [...messages, userMsg];
        const lastWithProducts = [...allMsgs].reverse().find(
          (m) => m.role === "assistant" && m.products && m.products.length > 0
        );

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: history,
            cart,
            deliveryCity,
            deliveryDate,
            lastProducts: lastWithProducts?.products,
          }),
        });
        if (!res.ok || !res.body) throw new Error("API error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(part.slice(6)) as {
                t: string;
                v?: unknown;
              };

              if (payload.t === "step") {
                setLiveSteps((prev) => [...prev, payload.v as string]);
              } else if (payload.t === "token") {
                if (!streamingMsgIdRef.current) {
                  const msgId = `kira-${Date.now()}`;
                  streamingMsgIdRef.current = msgId;
                  setIsStreaming(true);
                  const pendingDelivery = pendingDeliveryRef.current;
                  const pendingTracking = pendingTrackingRef.current;
                  const pendingCheckout = pendingCheckoutRef.current;
                  const pendingProducts = pendingProductsRef.current;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: msgId,
                      role: "assistant",
                      content: payload.v as string,
                      timestamp: Date.now(),
                      ...(pendingProducts ? { products: pendingProducts } : {}),
                      ...(pendingDelivery ? { deliveryInfo: pendingDelivery } : {}),
                      ...(pendingTracking ? { tracking: pendingTracking } : {}),
                      ...(pendingCheckout
                        ? {
                            checkout: pendingCheckout,
                            payLink: pendingCheckout.checkoutUrl,
                          }
                        : {}),
                    },
                  ]);
                } else {
                  const id = streamingMsgIdRef.current;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? { ...m, content: m.content + (payload.v as string) }
                        : m
                    )
                  );
                }
              } else if (payload.t === "products") {
                const id = streamingMsgIdRef.current;
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? { ...m, products: payload.v as KiraProduct[] }
                        : m
                    )
                  );
                } else {
                  pendingProductsRef.current = payload.v as KiraProduct[];
                }
              } else if (payload.t === "context") {
                const ctx = payload.v as { city?: string };
                if (ctx?.city) setDeliveryCity(ctx.city);
              } else if (payload.t === "delivery") {
                const info = payload.v as DeliveryQuote;
                if (info?.city) setDeliveryCity(info.city);
                const id = streamingMsgIdRef.current;
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id ? { ...m, deliveryInfo: info } : m
                    )
                  );
                } else {
                  pendingDeliveryRef.current = info;
                }
              } else if (payload.t === "tracking") {
                const tracking = payload.v as OrderTracking;
                const id = streamingMsgIdRef.current;
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id ? { ...m, tracking } : m
                    )
                  );
                } else {
                  pendingTrackingRef.current = tracking;
                }
              } else if (payload.t === "checkout") {
                const checkout = payload.v as CheckoutInfo;
                setPayLink(checkout.checkoutUrl);
                const id = streamingMsgIdRef.current;
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? {
                            ...m,
                            checkout,
                            payLink: checkout.checkoutUrl,
                          }
                        : m
                    )
                  );
                } else {
                  pendingCheckoutRef.current = checkout;
                }
              } else if (payload.t === "payLink") {
                setPayLink(payload.v as string);
                const id = streamingMsgIdRef.current;
                if (id)
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? { ...m, payLink: payload.v as string }
                        : m
                    )
                  );
              } else if (payload.t === "stepSummary") {
                pendingStepSummaryRef.current = payload.v as string;
              } else if (payload.t === "done") {
                const id = streamingMsgIdRef.current;
                const elapsed = Date.now() - thinkingStartRef.current;
                const stepSummary = pendingStepSummaryRef.current ?? undefined;
                pendingStepSummaryRef.current = null;
                setLiveSteps((completedSteps) => {
                  if (id) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === id
                          ? { ...m, thinkingMs: elapsed, steps: completedSteps, thinkingSummary: stepSummary }
                          : m
                      )
                    );
                  } else {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `kira-${Date.now()}`,
                        role: "assistant",
                        content: "Aiyo, something went wrong. Try again?",
                        timestamp: Date.now(),
                        thinkingMs: elapsed,
                        steps: completedSteps,
                        thinkingSummary: stepSummary,
                      },
                    ]);
                  }
                  return completedSteps;
                });
                setIsLoading(false);
                setIsStreaming(false);
                abortControllerRef.current = null;
              } else if (payload.t === "error") {
                const errMsg =
                  (payload.v as string) ||
                  "Aiyo, something went wrong. Try again?";
                const id = streamingMsgIdRef.current;
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, content: errMsg } : m))
                  );
                } else {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `err-${Date.now()}`,
                      role: "assistant",
                      content: errMsg,
                      timestamp: Date.now(),
                    },
                  ]);
                }
                setIsLoading(false);
                setIsStreaming(false);
                abortControllerRef.current = null;
              }
            } catch {
              /* malformed SSE chunk — skip */
            }
          }
        }
      } catch (error) {
        if (
          cancelledRef.current ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        const errMsg = "Aiyo, something went wrong on my end. Try again?";
        const id = streamingMsgIdRef.current;
        if (id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: errMsg } : m))
          );
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: errMsg,
              timestamp: Date.now(),
            },
          ]);
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        if (!cancelledRef.current) {
          setIsLoading(false);
          setIsStreaming(false);
        }
      }
    },
    [messages, cart, deliveryCity, deliveryDate, isLoading, setPayLink]
  );

  const isOnlyOpening = messages.length === 1 && messages[0].id === "opening";
  const showProductSkeleton =
    isLoading &&
    !isStreaming &&
    liveSteps.some(
      (step) =>
        step.includes("Searching Kapruka catalog") ||
        step.includes("Browsing categories")
    );

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0818 0%, #1a0f33 50%, #0f1629 100%)", color: "rgba(255,255,255,0.92)" }}>
      {!appReady && <KiraLoader onDone={() => setAppReady(true)} />}
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute" style={{ top: "-80px", left: "-60px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(64,41,112,0.65) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div className="pointer-events-none absolute" style={{ top: "30%", right: "20%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(148,100,255,0.12) 0%, transparent 70%)", filter: "blur(80px)", zIndex: 0 }} />
      <div className="pointer-events-none absolute" style={{ bottom: "60px", right: "-40px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(248,218,8,0.1) 0%, transparent 70%)", filter: "blur(70px)", zIndex: 0 }} />

      <header
        className="glass-nav relative z-10 flex h-14 lg:h-[4.5rem] shrink-0 items-center justify-between px-4 sm:px-6 lg:px-10"
        style={{ borderBottom: "1px solid rgba(148,100,255,0.22)", background: "rgba(10,6,20,0.72)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/kira-logo.svg"
            alt="Kira"
            width={120}
            height={56}
            className="object-contain"
            style={{ width: "auto", height: "2.75rem" }}
            priority
          />
          <div className="hidden h-8 items-center gap-2.5 border-l border-white/10 pl-3.5 sm:flex">
            <span className="text-xs font-semibold tracking-wide text-white/35">
              by Kapruka
            </span>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-kira-leaf" style={{ background: "rgba(74,222,128,0.09)", border: "1px solid rgba(74,222,128,0.18)" }}>
              <BadgeCheck className="size-3" />
              Live catalog
            </span>
            <span aria-hidden="true" className="text-white/15">·</span>
            <McpStatusBadge />
          </div>
        </div>

        {cartCount > 0 ? (
          <button
            ref={cartButtonRef}
            type="button"
            onClick={openCart}
            aria-label={`Open gift tray, ${cartCount} item${
              cartCount === 1 ? "" : "s"
            }, total ${formatLKR(cartTotal)}`}
            className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors"
            style={{ background: "rgba(64,41,112,0.4)", border: "1px solid rgba(148,100,255,0.3)" }}
          >
            <motion.span animate={bagControls} className="flex items-center">
              <ShoppingBag className="size-4" />
            </motion.span>
            <span>{cartCount}</span>
            <span className="hidden sm:inline">{formatLKR(cartTotal)}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-kira-leaf" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
            <Truck className="size-3.5" />
            Free delivery
          </span>
        )}
      </header>

      {isOnlyOpening ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
          <div className="mb-8 text-center animate-fade-up">
            <KaprukaSmileMark />
            <h1 className="mb-3 font-display text-4xl font-bold leading-[1.14] text-white sm:text-5xl">
              What would you like<br className="hidden sm:block" /> to gift today?
            </h1>
            <p className="text-white/40 text-sm">
              Live Kapruka catalog · Real delivery · Checkout
            </p>
          </div>

          <div
            className="w-full max-w-2xl animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            <KiraChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              onCancel={cancelActiveResponse}
            />
          </div>

          <div
            className="mt-4 flex w-full max-w-2xl flex-wrap justify-center gap-2 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {[
              // Lead with time-sensitive occasions (urgent chip first), then categories
              ...OCCASION_CHIPS.slice(0, 4)
                .map((chip) => ({
                  label: stripDecorativeGlyphs(chip.label),
                  value: chip.value,
                  Icon: null,
                  urgent: chip.urgent,
                }))
                .filter(
                  (option) =>
                    option.label !== "Flowers & cake" &&
                    option.label !== "Just browsing"
                )
                .sort((a, b) => Number(b.urgent) - Number(a.urgent)),
              ...CATEGORIES.slice(0, 4).map((category) => ({
                label: category.label,
                value: category.value,
                Icon: category.icon,
                urgent: false,
              })),
            ].map((option) => {
              const Icon = option.Icon;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => sendMessage(option.value)}
                  className={cn(
                    "glass-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold",
                    option.urgent
                      ? "text-gray-950"
                      : "text-white/85 hover:text-white"
                  )}
                  style={
                    option.urgent
                      ? {
                          background:
                            "linear-gradient(180deg, rgba(255,245,116,0.94), rgba(248,218,8,0.82))",
                          borderColor: "rgba(255,246,126,0.95)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -1px 0 rgba(94,76,0,0.18), 0 12px 28px rgba(248,218,8,0.18)",
                        }
                      : undefined
                  }
                >
                  {Icon && <Icon className="size-3.5" />}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <main
            role="log"
            aria-live="polite"
            aria-label="Conversation with Kira"
            className="relative z-10 min-h-0 flex-1 overflow-y-auto"
            style={{ background: "transparent" }}
          >
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-5 sm:px-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "assistant" && msg.thinkingMs && (
                    <ThinkingDone
                      thinkingMs={msg.thinkingMs}
                      steps={msg.steps}
                      summary={msg.thinkingSummary}
                    />
                  )}
                  <ChatMessage
                    message={msg}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    onOpenProduct={setSelectedProduct}
                    deliveryCity={deliveryCity}
                  />
                </div>
              ))}
              {isLoading && !isStreaming && (
                <ThinkingLive
                  steps={liveSteps}
                  showProductSkeleton={showProductSkeleton}
                />
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          <div
            className="glass-nav relative z-10 shrink-0"
            style={{
              borderTop: "1px solid rgba(148,100,255,0.18)",
              background: "rgba(10,6,20,0.72)",
            }}
          >
            <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <KiraChatInput
                onSendMessage={sendMessage}
                isLoading={isLoading}
                onCancel={cancelActiveResponse}
              />
              <p className="mt-2 text-center text-[10px] text-white/25">
                Powered by{" "}
                <a
                  href="https://www.kapruka.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-kap-yellow/50 hover:text-kap-yellow"
                >
                  Kapruka
                </a>
              </p>
            </div>
          </div>
        </>
      )}

      {selectedProduct && (
        <ProductQuickView
          key={selectedProduct.id}
          product={selectedProduct}
          cart={cart}
          onAddToCart={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
