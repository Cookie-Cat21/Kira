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
  ArrowRight,
  BadgeCheck,
  CakeSlice,
  CalendarDays,
  Flower2,
  Gift,
  MapPin,
  Package,
  PackageCheck,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import ChatMessage from "./components/ChatMessage";
import ProductQuickView from "./components/ProductQuickView";
import { ThinkingLive, ThinkingDone } from "./components/ThinkingBlock";
import CommerceRail, { type CommerceContext } from "./components/CommerceRail";
import {
  ChatInput,
  ChatInputTextArea,
  ChatInputSubmit,
} from "./components/ui/chat-input";
import { useCart } from "./context/CartContext";
import { getContextualGreeting, getOccasionChips } from "@/lib/kira-client";
import type {
  CartItem,
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

// Client-side heuristic context detection from user message text.
// Not perfect — server emits ground-truth `context` SSE events for values it
// can verify (e.g. budget from search params). This gives instant visual feedback.
function detectContextFromMessage(text: string): Partial<{
  budget: string;
  occasion: string;
  recipient: string;
}> {
  const lower = text.toLowerCase();
  const ctx: Partial<{ budget: string; occasion: string; recipient: string }> = {};

  const budgetMatch = lower.match(
    /\b(?:budget|under|below|within|max(?:imum)?|up\s*to|less\s*than)\s*(?:lkr\s*)?([\d,]+)/
  );
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(amount) && amount > 0)
      ctx.budget = `Under LKR ${amount.toLocaleString("en-LK")}`;
  }

  if (/\bfather'?s?\s*day\b/i.test(lower)) ctx.occasion = "Father's Day";
  else if (/\bmother'?s?\s*day\b/i.test(lower)) ctx.occasion = "Mother's Day";
  else if (/\bbirthday\b/i.test(lower)) ctx.occasion = "Birthday";
  else if (/\banniversary\b/i.test(lower)) ctx.occasion = "Anniversary";
  else if (/\bchristmas\b/i.test(lower)) ctx.occasion = "Christmas";
  else if (/\bwedding\b/i.test(lower)) ctx.occasion = "Wedding";
  else if (/\bvesak\b/i.test(lower)) ctx.occasion = "Vesak";
  else if (/\bavurudu\b/i.test(lower)) ctx.occasion = "Avurudu";
  else if (/\bposon\b/i.test(lower)) ctx.occasion = "Poson";
  else if (/\bnew year\b/i.test(lower)) ctx.occasion = "New Year";

  const recipientMatch = lower.match(
    /\bfor (?:my )?(dad|appa|thaththa|thaththi|amma|mum|mom|wife|husband|girlfriend|boyfriend|brother|sister|friend|boss|teacher|colleague)\b/
  );
  if (recipientMatch) {
    const r = recipientMatch[1];
    ctx.recipient = r.charAt(0).toUpperCase() + r.slice(1);
  }

  return ctx;
}

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

const CONCIERGE_PROMPTS: {
  eyebrow: string;
  label: string;
  value: string;
  icon: KiraIcon;
  tone: string;
}[] = [
  {
    eyebrow: "Fast route",
    label: "Father's Day under LKR 10,000",
    value: "Find a Father's Day gift for my dad under LKR 10,000",
    icon: Gift,
    tone: "border-kap-yellow/80 bg-kap-yellow/15 text-kira-text",
  },
  {
    eyebrow: "Fresh delivery",
    label: "Flowers and cake to Colombo",
    value: "I want to send flowers and a cake to Colombo",
    icon: Flower2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  {
    eyebrow: "Order help",
    label: "Track an existing order",
    value: "I want to track my Kapruka order",
    icon: PackageCheck,
    tone: "border-violet-100 bg-violet-50 text-violet-800",
  },
];

function stripDecorativeGlyphs(text: string) {
  return text.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function formatLKR(amount: number) {
  return currencyFormatter.format(amount);
}

function formatDeliveryDate(raw?: string) {
  if (!raw) return undefined;
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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

export default function KiraChat() {
  const [messages, setMessages] = useState<KiraMessage[]>([
    buildOpeningMessage(),
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>();
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string | undefined>();
  const [sessionBudget, setSessionBudget] = useState<string | undefined>();
  const [sessionOccasion, setSessionOccasion] = useState<string | undefined>();
  const [sessionRecipient, setSessionRecipient] = useState<string | undefined>();
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

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const commerceContext: CommerceContext = {
    city: deliveryCity,
    deliveryDate,
    budget: sessionBudget,
    occasion: sessionOccasion,
    recipient: sessionRecipient,
  };

  function handleCommerceChange(updates: Partial<CommerceContext>) {
    if ("city" in updates) setDeliveryCity(updates.city);
    if ("deliveryDate" in updates) setDeliveryDate(updates.deliveryDate);
    if ("budget" in updates) setSessionBudget(updates.budget);
    if ("occasion" in updates) setSessionOccasion(updates.occasion);
    if ("recipient" in updates) setSessionRecipient(updates.recipient);
  }

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

      // Instant context extraction — rail updates before Kira even responds
      const detected = detectContextFromMessage(trimmed);
      if (detected.budget) setSessionBudget(detected.budget);
      if (detected.occasion) setSessionOccasion(detected.occasion);
      if (detected.recipient) setSessionRecipient(detected.recipient);

      const userMsg: KiraMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
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
                const ctx = payload.v as { budget?: string; city?: string };
                if (ctx?.budget) setSessionBudget(ctx.budget);
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
              } else if (payload.t === "done") {
                const id = streamingMsgIdRef.current;
                const elapsed = Date.now() - thinkingStartRef.current;
                setLiveSteps((completedSteps) => {
                  if (id) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === id
                          ? { ...m, thinkingMs: elapsed, steps: completedSteps }
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
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-kira-canvas text-kira-text">
      <header
        className="z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6"
        style={{
          background: "rgba(251, 250, 246, 0.82)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.65)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(64,41,112,0.07)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/kira-logo.svg"
            alt="Kira"
            width={96}
            height={40}
            className="object-contain"
            style={{ width: "auto", height: "2rem" }}
            priority
          />
          <span className="font-display text-2xl leading-none text-kira-text">
            Kira
          </span>
          <div className="hidden h-8 items-center gap-2 border-l border-kira-line pl-3 sm:flex">
            <span className="text-xs font-semibold text-kira-muted">
              by Kapruka
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-kira-leaf">
              <BadgeCheck className="size-3.5" />
              Live catalog
            </span>
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
            className="relative flex items-center gap-2 rounded-xl border border-kap-purple/25 bg-kap-purple/10 px-3 py-2 text-xs font-bold text-kap-purple transition-colors hover:bg-kap-purple/15"
          >
            <motion.span animate={bagControls} className="flex items-center">
              <ShoppingBag className="size-4" />
            </motion.span>
            <span>{cartCount}</span>
            <span className="hidden sm:inline">{formatLKR(cartTotal)}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-kira-leaf">
            <Truck className="size-3.5" />
            Free delivery
          </span>
        )}
      </header>

      <CommerceRail context={commerceContext} onChange={handleCommerceChange} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <main
          role="log"
          aria-live="polite"
          aria-label="Conversation with Kira"
          className="min-h-0 overflow-y-auto bg-kira-canvas"
        >
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
            {isOnlyOpening ? (
              <GiftConciergeWelcome
                greeting={messages[0]?.content ?? ""}
                context={commerceContext}
                onPrompt={sendMessage}
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === "assistant" && msg.thinkingMs && (
                      <ThinkingDone
                        thinkingMs={msg.thinkingMs}
                        steps={msg.steps}
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
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

      </div>

      <div className="shrink-0 border-t border-kira-line bg-kira-paper">
        <div className="mx-auto grid w-full max-w-[1400px] gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <ChatInput
              value={input}
              setValue={setInput}
              isLoading={isLoading}
              onSubmit={sendMessage}
              onCancel={cancelActiveResponse}
              className="bg-white"
            >
              <ChatInputTextArea placeholder="Ask for a gift, budget, city, or order number..." />
              <ChatInputSubmit />
            </ChatInput>
            <p className="mt-2 text-center text-[10px] text-kira-muted lg:hidden">
              Powered by{" "}
              <a
                href="https://www.kapruka.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-kap-purple"
              >
                Kapruka
              </a>
            </p>
          </div>
          <div className="hidden items-center justify-between rounded-lg border border-kira-line bg-white px-4 text-[11px] font-semibold text-kira-muted lg:flex">
            <span>Powered by Kapruka</span>
            <span className="text-kira-leaf">Live products</span>
            <span>Real checkout</span>
          </div>
        </div>
      </div>

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

function GiftConciergeWelcome({
  greeting,
  context,
  onPrompt,
}: {
  greeting: string;
  context: CommerceContext;
  onPrompt: (text: string) => void;
}) {
  const deliveryValue =
    context.city && context.deliveryDate
      ? `${context.city}, ${formatDeliveryDate(context.deliveryDate)}`
      : context.city ?? formatDeliveryDate(context.deliveryDate) ?? "Pick city and date";

  return (
    <div className="flex flex-1 flex-col justify-center pb-3">
      <div className="grid gap-3 lg:grid-cols-12">
        <section className="gift-slip rounded-lg border border-kira-line bg-kira-paper p-5 shadow-sm sm:p-6 lg:col-span-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-kap-yellow text-gray-950">
              <Gift className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-kira-muted">
                Kira gift desk
              </p>
              <p className="text-sm font-semibold text-kira-leaf">
                Kapruka catalog, delivery, checkout
              </p>
            </div>
          </div>

          <h1 className="max-w-2xl text-balance font-display text-3xl leading-[1.05] text-kira-text sm:text-5xl">
            Send a better gift, without the catalog hunt.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-kira-text-2 sm:text-base">
            {greeting}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
            <BriefRow
              icon={Sparkles}
              label="Occasion"
              value={context.occasion ?? "Father's Day, birthday, thank you"}
            />
            <BriefRow
              icon={UserRound}
              label="Recipient"
              value={context.recipient ?? "Dad, amma, friend, colleague"}
            />
            <BriefRow
              icon={Wallet}
              label="Budget"
              value={context.budget ?? "Any range"}
            />
            <BriefRow icon={MapPin} label="Delivery" value={deliveryValue} />
          </div>
        </section>

        <section className="rounded-lg border border-kira-line bg-white p-4 shadow-sm lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-kira-muted">
              Start with a route
            </p>
            <Search className="size-4 text-kira-muted" />
          </div>
          <div className="space-y-2">
            {CONCIERGE_PROMPTS.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => onPrompt(prompt.value)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-kap-purple/40 hover:bg-kira-bg",
                    prompt.tone
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/80">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase text-current/65">
                      {prompt.eyebrow}
                    </span>
                    <span className="line-clamp-2 block text-sm font-bold leading-snug">
                      {prompt.label}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-kira-line bg-white p-4 shadow-sm lg:col-span-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-kira-text">
              Shop by gift type
            </h2>
            <span className="text-[11px] font-semibold text-kira-muted">
              Live Kapruka search
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => onPrompt(category.value)}
                  className={cn(
                    "flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left shadow-sm transition-colors hover:border-kap-purple/40 hover:bg-white",
                    category.tone
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-bold">{category.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-kira-line bg-kira-paper p-4 shadow-sm lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-kira-muted">
              Popular now
            </p>
            <Sparkles className="size-4 text-kap-purple" />
          </div>
          <div className="flex flex-wrap gap-2">
            {OCCASION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => onPrompt(chip.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                  chip.urgent
                    ? "border-kap-yellow bg-kap-yellow text-gray-950"
                    : "border-kira-line bg-white text-kira-text-2 hover:border-kap-purple/40 hover:text-kap-purple"
                )}
              >
                {stripDecorativeGlyphs(chip.label)}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function BriefRow({
  icon: Icon,
  label,
  value,
}: {
  icon: KiraIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-kira-line bg-white p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-kira-bg text-kap-purple">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase text-kira-muted">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold text-kira-text">
          {value}
        </span>
      </span>
    </div>
  );
}
