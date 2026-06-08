"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentType,
} from "react";
import Image from "next/image";
import {
  CakeSlice,
  Flower2,
  Gift,
  Package,
  Shirt,
  Smartphone,
  SquarePen,
  Truck,
  CalendarDays,
} from "lucide-react";
import KiraLoader from "./components/KiraLoader";
import McpStatusBadge from "./components/McpStatusBadge";
import ChatMessage from "./components/ChatMessage";
import ProductQuickView from "./components/ProductQuickView";
import { ThinkingLive, ThinkingDone } from "./components/ThinkingBlock";
import KiraChatInput from "./components/ui/kira-chat-input";
import QuickReplies from "./components/QuickReplies";
import CityPicker from "./components/CityPicker";
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
// An occasion is active iff getOccasionChips surfaced an urgent chip. When it
// is, the hero headline already announces it — so we drop the duplicate chip.
const HAS_ACTIVE_OCCASION = OCCASION_CHIPS.some((chip) => chip.urgent);
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
    value: "Show me cakes on Kapruka",
    tone: "border-rose-100 bg-rose-50 text-rose-800",
  },
  {
    icon: Flower2,
    label: "Flowers",
    value: "Show me flowers on Kapruka",
    tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  {
    icon: Gift,
    label: "Chocolates",
    value: "Show me chocolates on Kapruka",
    tone: "border-orange-100 bg-orange-50 text-orange-900",
  },
  {
    icon: Smartphone,
    label: "Electronics",
    value: "Show me electronics on Kapruka",
    tone: "border-sky-100 bg-sky-50 text-sky-800",
  },
  {
    icon: Shirt,
    label: "Fashion",
    value: "Show me fashion on Kapruka",
    tone: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800",
  },
  {
    icon: Package,
    label: "Hampers",
    value: "Show me gift hampers on Kapruka",
    tone: "border-amber-100 bg-amber-50 text-amber-900",
  },
];

function stripDecorativeGlyphs(text: string) {
  return text.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function buildOpeningMessage(): KiraMessage {
  // loadSession() is called before localStorage.removeItem in the "New chat"
  // handler, so isReturning is true when the user explicitly starts a new chat.
  const isReturning = !!loadSession();
  const greeting = getContextualGreeting(isReturning);
  const tail = isReturning
    ? "What are we finding today?"
    : "Tell me who it is for, your budget, and where it needs to go.";
  return {
    id: "opening",
    role: "assistant",
    content: `${greeting} ${tail}`,
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

const SESSION_KEY = "kira_session_v1";

interface PersistedSession {
  messages: KiraMessage[];
  deliveryCity?: string;
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveSession(messages: KiraMessage[], deliveryCity: string | undefined) {
  if (typeof window === "undefined") return;
  try {
    // Never persist the opening placeholder — it's re-generated fresh each load.
    const toSave = messages.filter((m) => m.id !== "opening");
    if (toSave.length === 0) return;
    const payload: PersistedSession = { messages: toSave, deliveryCity };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch { /* quota exceeded or private browsing */ }
}

export default function KiraChat() {
  const [appReady, setAppReady] = useState(false);

  const [messages, setMessages] = useState<KiraMessage[]>(() => [buildOpeningMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en");
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>(undefined);
  // Contextual greeting for the splash hero. Computed client-only (uses Date +
  // Math.random) to avoid a hydration mismatch — null until mount.
  const [heroGreeting, setHeroGreeting] = useState<string | null>(null);

  // Restore session from localStorage after hydration (client only).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = loadSession();
      if (session?.messages?.length) setMessages(session.messages);
      if (session?.deliveryCity) setDeliveryCity(session.deliveryCity);
      setHeroGreeting(getContextualGreeting(!!session?.messages?.length));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    // Default to tomorrow so the delivery API always receives a valid date.
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [a11yAnnounce, setA11yAnnounce] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<KiraProduct | null>(null);
  const {
    cart,
    addToCart,
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

  // Persist session after each completed response (not while streaming).
  useEffect(() => {
    if (!isLoading) saveSession(messages, deliveryCity);
  }, [messages, deliveryCity, isLoading]);

  const handleAddToCart = useCallback(
    (product: KiraProduct) => {
      addToCart(product);
      setA11yAnnounce(`${product.name} added to cart`);
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
      if (!trimmed) return;

      // If a response is already streaming, silently abort it and start fresh.
      if (isLoading && abortControllerRef.current) {
        cancelledRef.current = true;
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        streamingMsgIdRef.current = null;
        pendingDeliveryRef.current = null;
        pendingTrackingRef.current = null;
        pendingCheckoutRef.current = null;
        pendingProductsRef.current = null;
        setLiveSteps([]);
        setIsLoading(false);
        setIsStreaming(false);
      }

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
            language,
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
                        content: "Aiyo, something went wrong on my end — Kapruka's servers can be a bit finicky. Try again?",
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
                  "Aiyo, something went wrong on my end — Kapruka's servers can be a bit finicky. Try again?";
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
        const errMsg = "Aiyo, something went wrong on my end — Kapruka's servers can be a bit finicky. Try again?";
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
        // Always clear pending buffered events so they don't bleed into the next request.
        pendingDeliveryRef.current = null;
        pendingTrackingRef.current = null;
        pendingCheckoutRef.current = null;
        pendingProductsRef.current = null;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        if (!cancelledRef.current) {
          setIsLoading(false);
          setIsStreaming(false);
        }
      }
    },
    [messages, cart, deliveryCity, deliveryDate, isLoading, setPayLink, language]
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
      {/* Screen-reader live region for cart / order events */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{a11yAnnounce}</span>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute" style={{ top: "-80px", left: "-60px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(64,41,112,0.65) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div className="pointer-events-none absolute" style={{ top: "30%", right: "20%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(148,100,255,0.12) 0%, transparent 70%)", filter: "blur(80px)", zIndex: 0 }} />
      <div className="pointer-events-none absolute" style={{ bottom: "60px", right: "-40px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(248,218,8,0.1) 0%, transparent 70%)", filter: "blur(70px)", zIndex: 0 }} />

      <header className="liquid-glass-nav relative z-10 flex h-[52px] shrink-0 items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Left cluster */}
        <div className="flex min-w-0 items-center gap-2.5">
          {!isOnlyOpening && (
            <button
              type="button"
              aria-label="New chat"
              onClick={() => {
                setMessages([buildOpeningMessage()]);
                localStorage.removeItem(SESSION_KEY);
              }}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/30 transition-all duration-150 hover:bg-white/6 hover:text-white/70"
            >
              <SquarePen className="size-3.5" />
            </button>
          )}
          <Image
            src="/kira-logo.svg"
            alt="Kira"
            width={120}
            height={56}
            className="object-contain"
            style={{ width: "auto", height: "2.75rem" }}
            priority
          />
          {/* Status strip — hidden on mobile */}
          <div className="hidden items-center gap-0 sm:flex" style={{ marginLeft: "10px", paddingLeft: "12px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-[11px] font-medium tracking-[0.02em] text-white/28" style={{ fontFamily: "-apple-system, 'SF Pro Text', sans-serif", letterSpacing: "0.01em" }}>
              by Kapruka
            </span>
            {/* Live catalog pill */}
            <span className="ml-3 flex items-center gap-1" title="Live catalog connected">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-kira-leaf opacity-60" style={{ animationDuration: "2.4s" }} />
                <span className="relative inline-flex size-1.5 rounded-full bg-kira-leaf" />
              </span>
              <span className="text-[11px] font-medium text-white/40" style={{ fontFamily: "-apple-system, 'SF Pro Text', sans-serif" }}>
                Live
              </span>
            </span>
            <span aria-hidden="true" className="mx-2.5 text-white/12 select-none">·</span>
            <McpStatusBadge />
          </div>
        </div>

        {/* Right — Free delivery */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/38" style={{ fontFamily: "-apple-system, 'SF Pro Text', sans-serif" }}>
          <Truck className="size-3 text-kira-leaf/70" />
          <span>Free delivery</span>
        </div>
      </header>

      {isOnlyOpening ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
          <div className="mb-8 text-center animate-fade-up">
            <KaprukaSmileMark />
            <h1 className="mb-3 min-h-[1.14em] font-sans text-4xl font-bold leading-[1.14] text-white sm:text-5xl">
              {heroGreeting ?? "Hello! 👋"}
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
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>

          <div
            className="mt-4 flex flex-wrap sm:flex-nowrap justify-center gap-2 px-4 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {[
              // The hero headline already announces any active occasion, so drop
              // the redundant urgent occasion chip and lead with categories.
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
                    option.label !== "Just browsing" &&
                    !(HAS_ACTIVE_OCCASION && option.urgent)
                )
                .sort((a, b) => Number(b.urgent) - Number(a.urgent)),
              ...CATEGORIES.slice(0, HAS_ACTIVE_OCCASION ? 5 : 4).map((category) => ({
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
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium tracking-[-0.01em] whitespace-nowrap",
                    option.urgent
                      ? "glass-chip-urgent text-[rgba(255,210,80,0.95)]"
                      : "glass-chip text-white/88"
                  )}
                >
                  {Icon && <Icon className="size-3 opacity-60" />}
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
              <QuickReplies
                messages={messages}
                deliveryCity={deliveryCity}
                isLoading={isLoading}
                onSelect={sendMessage}
              />
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
            className="relative z-10 shrink-0"
          >
            <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <KiraChatInput
                onSendMessage={sendMessage}
                isLoading={isLoading}
                onCancel={cancelActiveResponse}
                language={language}
                onLanguageChange={setLanguage}
              />
              <div className="mt-2 flex items-center justify-between px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CityPicker value={deliveryCity} onChange={setDeliveryCity} />
                  <DeliveryDatePicker
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                  />
                </div>
                <p className="text-[10px] text-white/25">
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

function DeliveryDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white/70"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <CalendarDays className="size-3 shrink-0" />
      <span className="sr-only">Delivery date</span>
      <input
        type="date"
        min={new Date().toISOString().slice(0, 10)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-[7.6rem] bg-transparent text-xs font-semibold text-white/80 outline-none [color-scheme:dark]"
        aria-label="Delivery date"
      />
    </label>
  );
}
