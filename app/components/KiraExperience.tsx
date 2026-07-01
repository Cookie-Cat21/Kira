"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ComponentType,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CakeSlice,
  Flower2,
  Gift,
  Package,
  Shirt,
  Smartphone,
  SquarePen,
  Store,
  Truck,
  CalendarDays,
  ShoppingBasket,
  Baby,
  Home,
} from "lucide-react";
import KiraLoader from "./KiraLoader";
import McpStatusBadge from "./McpStatusBadge";
import ChatMessage from "./ChatMessage";
import CheckoutModal from "./CheckoutModal";
import ProductQuickView from "./ProductQuickView";
import { ThinkingLive, ThinkingDone, type LiveStep } from "./ThinkingBlock";
import KiraChatInput from "./ui/kira-chat-input";
import QuickReplies from "./QuickReplies";
import CityPicker from "./CityPicker";
import CommerceRail, { type CommerceContext } from "./CommerceRail";
import { useCart } from "../context/CartContext";
import type { KiraDockSeed } from "../context/KiraDockContext";
import { useKiraDock } from "../context/KiraDockContext";
import { getContextualGreeting, getOccasionChips, getStarterPrompts } from "@/lib/kira-client";
import {
  getColomboTodayIso,
  getColomboTomorrowIso,
  parseRelativeDeliveryDate,
} from "@/lib/colombo-date";
import type {
  CheckoutInfo,
  DeliveryQuote,
  KiraMessage,
  KiraProduct,
  LastOrder,
  OrderTracking,
} from "@/types";
import { cn } from "@/lib/utils";
import KaprukaSmileMark from "@/app/components/brand/KaprukaSmileMark";

const CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

type KiraIcon = ComponentType<{ className?: string }>;

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
  {
    icon: ShoppingBasket,
    label: "Grocery",
    value: "Show me grocery items on Kapruka",
    tone: "border-lime-100 bg-lime-50 text-lime-900",
  },
  {
    icon: Baby,
    label: "Kids & Toys",
    value: "Show me soft toys and kids gifts on Kapruka",
    tone: "border-violet-100 bg-violet-50 text-violet-900",
  },
  {
    icon: Home,
    label: "Home",
    value: "Show me home and lifestyle products on Kapruka",
    tone: "border-stone-100 bg-stone-50 text-stone-900",
  },
];

function stripDecorativeGlyphs(text: string) {
  return text.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function parseBudgetChip(text: string): string | undefined {
  const match =
    text.match(/\b(?:under|below|max(?:imum)?|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+)/i) ??
    text.match(/\b(?:lkr|rs\.?)\s*([\d,]+)/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return `Under LKR ${amount.toLocaleString("en-LK")}`;
}

function parseBudgetAmountFromChip(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\b([\d,]{3,})\b/);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function parseOccasionChip(text: string): string | undefined {
  const match = text.match(
    /\b(birthday|anniversary|wedding|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|get well|congratulations)\b/i
  );
  return match?.[1]?.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseRecipientChip(text: string): string | undefined {
  const match = text.match(
    /\bfor\s+(?:my\s+)?(girlfriend|boyfriend|wife|husband|mum|mom|mother|amma|dad|father|thaththa|friend|sister|brother|daughter|son|boss|colleague|partner)\b/i
  );
  return match?.[1]?.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDeliveryDateChip(text: string): string | undefined {
  return parseRelativeDeliveryDate(text);
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


const SESSION_KEY = "kira_session_v2";

interface PersistedSession {
  messages: KiraMessage[];
  deliveryCity?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
  lastOrder?: LastOrder;
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem("kira_session_v1");
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveSession(
  messages: KiraMessage[],
  deliveryCity: string | undefined,
  deliveryDate: string | undefined,
  budget: string | undefined,
  occasion: string | undefined,
  recipient: string | undefined,
  lastOrder: LastOrder | undefined
) {
  if (typeof window === "undefined") return;
  try {
    const toSave = messages.filter((m) => m.id !== "opening");
    if (toSave.length === 0 && !lastOrder) return;
    const payload: PersistedSession = {
      messages: toSave,
      deliveryCity,
      deliveryDate,
      budget,
      occasion,
      recipient,
      lastOrder,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch { /* quota exceeded or private browsing */ }
}

export default function KiraExperience({
  embedded = false,
  seed = null,
}: {
  embedded?: boolean;
  seed?: KiraDockSeed | null;
}) {
  // When docked inside the storefront we skip the full-screen loader splash.
  const [appReady, setAppReady] = useState(embedded);
  const { setThinking } = useKiraDock();

  const [messages, setMessages] = useState<KiraMessage[]>(() => [buildOpeningMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en");
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>(undefined);
  const [budget, setBudget] = useState<string | undefined>(undefined);
  const [occasion, setOccasion] = useState<string | undefined>(undefined);
  const [recipient, setRecipient] = useState<string | undefined>(undefined);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => getColomboTomorrowIso());
  const [lastOrder, setLastOrder] = useState<LastOrder | undefined>(undefined);
  // Contextual greeting for the splash hero. Computed client-only (uses Date +
  // Math.random) to avoid a hydration mismatch — null until mount.
  const [heroGreeting, setHeroGreeting] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [requestHealth, setRequestHealth] = useState<"idle" | "loading" | "error">("idle");
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  // Restore session from localStorage after hydration (client only).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = loadSession();
      if (session?.messages?.length) setMessages(session.messages);
      if (session?.deliveryCity) setDeliveryCity(session.deliveryCity);
      if (session?.deliveryDate) setDeliveryDate(session.deliveryDate);
      if (session?.budget) setBudget(session.budget);
      if (session?.occasion) setOccasion(session.occasion);
      if (session?.recipient) setRecipient(session.recipient);
      if (session?.lastOrder) setLastOrder(session.lastOrder);
      setHeroGreeting(getContextualGreeting(!!session?.messages?.length));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [liveStepSummary, setLiveStepSummary] = useState<string | undefined>();
  const [lastStreamActivityAt, setLastStreamActivityAt] = useState<number>(Date.now());
  const [a11yAnnounce, setA11yAnnounce] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<KiraProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const {
    cart,
    addToCart,
    setPayLink,
    openCart,
    cartCount,
    cartTotal,
    setCheckoutDefaults,
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
  const pendingPayLinkRef = useRef<string | null>(null);
  const streamCompletedRef = useRef(false);
  const pendingStepSummaryRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    setThinking(isLoading);
    return () => setThinking(false);
  }, [isLoading, setThinking]);

  useEffect(() => {
    setCheckoutDefaults({ city: deliveryCity, date: deliveryDate });
  }, [deliveryCity, deliveryDate, setCheckoutDefaults]);

  // Persist session after each completed response (not while streaming).
  useEffect(() => {
    if (!isLoading) {
      saveSession(messages, deliveryCity, deliveryDate, budget, occasion, recipient, lastOrder);
    }
  }, [messages, deliveryCity, deliveryDate, budget, occasion, recipient, lastOrder, isLoading]);

  const handleAddToCart = useCallback(
    (product: KiraProduct) => {
      addToCart(product);
      setA11yAnnounce(`${product.name} added to cart`);
    },
    [addToCart]
  );

  const handleReorderFromTracking = useCallback(
    (tracking: OrderTracking) => {
      if (!tracking.items?.length) return;
      const items = tracking.items.map((item) => ({
        product: {
          id: item.productId || `tracking-${item.name.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name,
          price: item.sellingPrice ?? 0,
          currency: "LKR" as const,
        },
        quantity: item.quantity,
      }));
      for (const { product, quantity } of items) {
        for (let q = 0; q < quantity; q++) addToCart(product);
      }
      setLastOrder({
        orderRef: tracking.orderNumber,
        items,
        placedAt: Date.now(),
      });
      setA11yAnnounce("Previous order items added to cart");
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
    pendingPayLinkRef.current = null;
    setLiveSteps([]);
    setLiveStepSummary(undefined);
    setIsLoading(false);
    setIsStreaming(false);
    setRequestHealth("idle");
    setLastErrorMessage(null);
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
        pendingPayLinkRef.current = null;
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
      setLastUserPrompt(trimmed);
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsStreaming(false);
      setLiveSteps([]);
      setLiveStepSummary(undefined);
      setRequestHealth("loading");
      setLastErrorMessage(null);
      cancelledRef.current = false;
      streamCompletedRef.current = false;
      streamingMsgIdRef.current = null;
      pendingDeliveryRef.current = null;
      pendingTrackingRef.current = null;
      pendingCheckoutRef.current = null;
      pendingProductsRef.current = null;
      pendingPayLinkRef.current = null;
      thinkingStartRef.current = Date.now();
      setLastStreamActivityAt(Date.now());
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let requestDeliveryCity = deliveryCity;
      if (!deliveryCity) {
        const m = trimmed.match(CITY_REGEX);
        if (m) {
          const city = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
          requestDeliveryCity = city;
          setDeliveryCity(city);
        }
      }
      const parsedBudget = parseBudgetChip(trimmed);
      const parsedOccasion = parseOccasionChip(trimmed);
      const parsedRecipient = parseRecipientChip(trimmed);
      const parsedDeliveryDate = parseDeliveryDateChip(trimmed);
      const requestBudget = parsedBudget ?? budget;
      const requestOccasion = parsedOccasion ?? occasion;
      const requestRecipient = parsedRecipient ?? recipient;
      const requestDeliveryDate = parsedDeliveryDate ?? deliveryDate;
      if (parsedBudget) setBudget(parsedBudget);
      if (parsedOccasion) setOccasion(parsedOccasion);
      if (parsedRecipient) setRecipient(parsedRecipient);
      if (parsedDeliveryDate) setDeliveryDate(parsedDeliveryDate);

      try {
        // Include the client-side opening bubble so the LLM knows Kira already
        // greeted — avoids a second "Hey, I'm Kira" after "Welcome back!".
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const allMsgs = [...messages, userMsg];
        const lastWithProducts = [...allMsgs].reverse().find(
          (m) => m.role === "assistant" && m.products && m.products.length > 0
        );
        const shownById = new Map<string, KiraProduct>();
        for (const m of allMsgs) {
          if (m.role !== "assistant" || !m.products?.length) continue;
          for (const p of m.products) shownById.set(p.id, p);
        }
        const shownProducts = [...shownById.values()];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: history,
            cart,
            deliveryCity: requestDeliveryCity,
            deliveryDate: requestDeliveryDate,
            budget: requestBudget,
            occasion: requestOccasion,
            recipient: requestRecipient,
            lastProducts: lastWithProducts?.products,
            shownProducts,
            lastOrder,
            language,
            internationalMode: /\b(overseas|from (uk|us|australia|dubai|uae)|dollars|pounds|aud)\b/i.test(trimmed),
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

              if (payload.t === "ping") {
                /* keepalive — ignore */
              } else if (payload.t === "step") {
                const raw = payload.v;
                setLastStreamActivityAt(Date.now());
                setLiveSteps((prev) => [
                  ...prev,
                  typeof raw === "string"
                    ? { id: `step-${Date.now()}-${prev.length}`, label: raw }
                    : {
                        id: (raw as { id: string }).id,
                        label: (raw as { label: string }).label,
                      },
                ]);
              } else if (payload.t === "stepDone") {
                const stepId = payload.v as string;
                setLastStreamActivityAt(Date.now());
                setLiveSteps((prev) =>
                  prev.map((s) => (s.id === stepId ? { ...s, done: true } : s))
                );
              } else if (payload.t === "token") {
                setLastStreamActivityAt(Date.now());
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
                const ctx = payload.v as CommerceContext;
                if (ctx?.city) setDeliveryCity(ctx.city);
                if (ctx?.deliveryDate) setDeliveryDate(ctx.deliveryDate);
                if (ctx?.budget) setBudget(ctx.budget);
                if (ctx?.occasion) setOccasion(ctx.occasion);
                if (ctx?.recipient) setRecipient(ctx.recipient);
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
                if (cart.length > 0) {
                  setLastOrder({
                    orderRef: checkout.orderRef,
                    items: cart,
                    placedAt: Date.now(),
                  });
                }
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
              } else if (payload.t === "lastOrder") {
                setLastOrder(payload.v as LastOrder);
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
                else {
                  pendingPayLinkRef.current = payload.v as string;
                }
              } else if (payload.t === "addToCart") {
                addToCart(payload.v as KiraProduct);
              } else if (payload.t === "stepSummary") {
                pendingStepSummaryRef.current = payload.v as string;
                setLiveStepSummary(payload.v as string);
                setLastStreamActivityAt(Date.now());
              } else if (payload.t === "done") {
                streamCompletedRef.current = true;
                const id = streamingMsgIdRef.current;
                const elapsed = Date.now() - thinkingStartRef.current;
                const stepSummary = pendingStepSummaryRef.current ?? undefined;
                pendingStepSummaryRef.current = null;
                setLiveSteps((completedSteps) => {
                  const stepLabels = completedSteps.map((s) => s.label);
                  if (id) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === id
                          ? { ...m, thinkingMs: elapsed, steps: stepLabels, thinkingSummary: stepSummary }
                          : m
                      )
                    );
                  } else {
                    const pendingDelivery = pendingDeliveryRef.current;
                    const pendingTracking = pendingTrackingRef.current;
                    const pendingCheckout = pendingCheckoutRef.current;
                    const pendingProducts = pendingProductsRef.current;
                    const pendingPayLink = pendingPayLinkRef.current;
                    const hasStructuredPayload =
                      !!pendingDelivery ||
                      !!pendingTracking ||
                      !!pendingCheckout ||
                      !!pendingProducts?.length ||
                      !!pendingPayLink;
                    const content = pendingCheckout || pendingPayLink
                      ? "Checkout is ready."
                      : pendingTracking
                      ? "I found the tracking details."
                      : pendingProducts?.length
                      ? "Here are the live Kapruka results."
                      : pendingDelivery
                      ? "Delivery checked."
                      : "Aiyo, something went wrong on my end — Kapruka's servers can be a bit finicky. Try again?";
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `kira-${Date.now()}`,
                        role: "assistant",
                        content,
                        timestamp: Date.now(),
                        ...(pendingProducts ? { products: pendingProducts } : {}),
                        ...(pendingDelivery ? { deliveryInfo: pendingDelivery } : {}),
                        ...(pendingTracking ? { tracking: pendingTracking } : {}),
                        ...(pendingCheckout
                          ? {
                              checkout: pendingCheckout,
                              payLink: pendingCheckout.checkoutUrl,
                            }
                          : pendingPayLink
                          ? { payLink: pendingPayLink }
                          : {}),
                        thinkingMs: elapsed,
                        steps: stepLabels,
                        thinkingSummary: stepSummary,
                      },
                    ]);
                    if (!hasStructuredPayload) {
                      setRequestHealth("error");
                      setLastErrorMessage(content);
                    }
                  }
                  return completedSteps;
                });
                setIsLoading(false);
                setIsStreaming(false);
                setRequestHealth("idle");
                setLastErrorMessage(null);
                abortControllerRef.current = null;
                streamingMsgIdRef.current = null;
              } else if (payload.t === "error") {
                streamCompletedRef.current = true;
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
                setRequestHealth("error");
                setLastErrorMessage(errMsg);
                abortControllerRef.current = null;
                streamingMsgIdRef.current = null;
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
        setRequestHealth("error");
        setLastErrorMessage(errMsg);
      } finally {
        if (abortControllerRef.current === abortController && !cancelledRef.current) {
          if (!streamCompletedRef.current) {
            const elapsed = Date.now() - thinkingStartRef.current;
            const stepSummary = pendingStepSummaryRef.current ?? undefined;
            const stepLabels: string[] = [];
            const id = streamingMsgIdRef.current;
            const pendingDelivery = pendingDeliveryRef.current;
            const pendingTracking = pendingTrackingRef.current;
            const pendingCheckout = pendingCheckoutRef.current;
            const pendingProducts = pendingProductsRef.current;
            const pendingPayLink = pendingPayLinkRef.current;
            const truncateMsg =
              "Aiyo — that took too long or got cut off. Kapruka's servers can be finicky. Tap retry and I'll try again.";
            if (id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id
                    ? {
                        ...m,
                        content: m.content.trim() || truncateMsg,
                        ...(pendingProducts && !m.products?.length
                          ? { products: pendingProducts }
                          : {}),
                        thinkingMs: elapsed,
                        steps: stepLabels,
                        thinkingSummary: stepSummary,
                      }
                    : m
                )
              );
            } else {
              const hasStructuredPayload =
                !!pendingDelivery ||
                !!pendingTracking ||
                !!pendingCheckout ||
                !!pendingProducts?.length ||
                !!pendingPayLink;
              const content = pendingCheckout || pendingPayLink
                ? "Checkout is ready."
                : pendingTracking
                ? "I found the tracking details."
                : pendingProducts?.length
                ? "Here are the live Kapruka results."
                : pendingDelivery
                ? "Delivery checked."
                : truncateMsg;
              setMessages((prev) => [
                ...prev,
                {
                  id: `kira-${Date.now()}`,
                  role: "assistant",
                  content,
                  timestamp: Date.now(),
                  ...(pendingProducts ? { products: pendingProducts } : {}),
                  ...(pendingDelivery ? { deliveryInfo: pendingDelivery } : {}),
                  ...(pendingTracking ? { tracking: pendingTracking } : {}),
                  ...(pendingCheckout
                    ? { checkout: pendingCheckout, payLink: pendingCheckout.checkoutUrl }
                    : pendingPayLink
                    ? { payLink: pendingPayLink }
                    : {}),
                  thinkingMs: elapsed,
                  steps: stepLabels,
                  thinkingSummary: stepSummary,
                },
              ]);
            }
            if (
              !pendingProducts?.length &&
              !pendingDelivery &&
              !pendingTracking &&
              !pendingCheckout &&
              !pendingPayLink
            ) {
              setRequestHealth("error");
              setLastErrorMessage(truncateMsg);
            } else {
              setRequestHealth("idle");
            }
          }
        }
        // Always clear pending buffered events so they don't bleed into the next request.
        pendingDeliveryRef.current = null;
        pendingTrackingRef.current = null;
        pendingCheckoutRef.current = null;
        pendingProductsRef.current = null;
        pendingPayLinkRef.current = null;
        pendingStepSummaryRef.current = null;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        if (!cancelledRef.current) {
          setIsLoading(false);
          setIsStreaming(false);
          if (streamCompletedRef.current) {
            setRequestHealth("idle");
          }
        }
      }
    },
    [
      messages,
      cart,
      deliveryCity,
      deliveryDate,
      budget,
      occasion,
      recipient,
      isLoading,
      setPayLink,
      language,
      lastOrder,
      addToCart,
    ]
  );

  // Seeded opening from a storefront surface (e.g. "Ask Kira about this" on a
  // product page). Two-step on purpose: the setTimeout lands after the
  // session-restore timeout above so restored messages aren't clobbered, and
  // routing the prompt through state gives React one render to commit the
  // product message before sendMessage scans `messages` for lastProducts.
  const seedFiredRef = useRef(false);
  const seedSentRef = useRef(false);
  const [pendingSeedPrompt, setPendingSeedPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!seed?.prompt) return;
    const timer = window.setTimeout(() => {
      if (seedFiredRef.current) return;
      seedFiredRef.current = true;
      if (seed.product) {
        const product = seed.product;
        setMessages((prev) => [
          ...prev,
          {
            id: `seed-${Date.now()}`,
            role: "assistant",
            content: "Here's the one you were looking at:",
            timestamp: Date.now(),
            products: [product],
          },
        ]);
      }
      setPendingSeedPrompt(seed.prompt);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [seed]);

  useEffect(() => {
    if (!pendingSeedPrompt || seedSentRef.current) return;
    seedSentRef.current = true;
    sendMessage(pendingSeedPrompt);
  }, [pendingSeedPrompt, sendMessage]);

  const isOnlyOpening = messages.length === 1 && messages[0].id === "opening";
  const showProductSkeleton =
    isLoading &&
    !isStreaming &&
    liveSteps.some(
      (step) =>
        step.label.includes("Searching Kapruka catalog") ||
        step.label.includes("Browsing categories")
    );
  const latestLiveStep = liveSteps[liveSteps.length - 1]?.label;
  const latestDeliveryInfo = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant" && msg.deliveryInfo)?.deliveryInfo;
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const cartCurrency = cart[0]?.product.currency ?? latestDeliveryInfo?.currency ?? "LKR";
  const estimatedTotal =
    latestDeliveryInfo?.fee !== undefined ? cartSubtotal + latestDeliveryInfo.fee : undefined;
  const canRetryLastPrompt = !!lastUserPrompt && !isLoading;
  const budgetAmount = parseBudgetAmountFromChip(budget);
  const commerceContext: CommerceContext = {
    city: deliveryCity,
    deliveryDate,
    budget,
    occasion,
    recipient,
  };
  const handleCommerceContextChange = (updates: Partial<CommerceContext>) => {
    if ("city" in updates) setDeliveryCity(updates.city);
    if ("deliveryDate" in updates && updates.deliveryDate) {
      setDeliveryDate(updates.deliveryDate);
    }
    if ("deliveryDate" in updates && updates.deliveryDate === undefined) {
      setDeliveryDate(getColomboTomorrowIso());
    }
    if ("budget" in updates) setBudget(updates.budget);
    if ("occasion" in updates) setOccasion(updates.occasion);
    if ("recipient" in updates) setRecipient(updates.recipient);
  };

  const occasionChips = useMemo(() => getOccasionChips(), []);
  const starterPrompts = useMemo(() => getStarterPrompts(), []);
  const hasActiveOccasion = occasionChips.some((chip) => chip.urgent);

  return (
    <div
      className={cn("relative flex flex-col overflow-hidden", embedded ? "h-full" : "h-dvh min-h-dvh")}
      style={{ background: "linear-gradient(135deg, #0d0818 0%, #1a0f33 50%, #0f1629 100%)", color: "rgba(255,255,255,0.92)" }}
    >
      {!appReady && <KiraLoader onDone={() => setAppReady(true)} />}
      {/* Screen-reader live region for cart / order events */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{a11yAnnounce}</span>
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
                const preservedOrder = lastOrder;
                setMessages([buildOpeningMessage()]);
                if (preservedOrder) {
                  saveSession([], deliveryCity, deliveryDate, budget, occasion, recipient, preservedOrder);
                } else {
                  localStorage.removeItem(SESSION_KEY);
                }
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

        {/* Right — Free delivery + store bridge */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-[11px] font-medium text-white/38 sm:flex" style={{ fontFamily: "-apple-system, 'SF Pro Text', sans-serif" }}>
            <Truck className="size-3 text-kira-leaf/70" />
            <span>Free delivery</span>
          </div>
          {!embedded && (
            <Link
              href="/"
              className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:text-white"
            >
              <Store className="size-3.5 text-kap-yellow/80" />
              <span>Home</span>
            </Link>
          )}
        </div>
      </header>

      <CommerceRail
        context={commerceContext}
        onChange={handleCommerceContextChange}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={openCart}
      />

      {isOnlyOpening ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
          <div className="mb-8 text-center animate-fade-up">
            <KaprukaSmileMark
              className="mx-auto mb-5 h-auto w-28 sm:w-36"
              testId="kapruka-smile-mark"
            />
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
            className="mt-4 w-full max-w-2xl animate-fade-up rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3"
            style={{ animationDelay: "90ms" }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
              Start fast
            </p>
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => sendMessage(prompt.value)}
                  className="glass-chip rounded-full px-3 py-1.5 text-xs font-semibold text-white/85 transition-colors hover:text-white"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="mt-4 flex flex-wrap sm:flex-nowrap justify-center gap-2 px-4 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {[
              ...occasionChips.slice(0, 4)
                .map((chip) => ({
                  label: stripDecorativeGlyphs(chip.label),
                  value: chip.value,
                  Icon: null as KiraIcon | null,
                  urgent: chip.urgent,
                }))
                .filter(
                  (option) =>
                    option.label !== "Flowers & cake" &&
                    option.label !== "Just browsing" &&
                    !(hasActiveOccasion && option.urgent)
                )
                .sort((a, b) => Number(b.urgent) - Number(a.urgent)),
              ...CATEGORIES.slice(0, hasActiveOccasion ? 5 : 4).map((category) => ({
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
                    onReorderFromTracking={handleReorderFromTracking}
                    deliveryCity={deliveryCity}
                  />
                </div>
              ))}
              <QuickReplies
                messages={messages}
                deliveryCity={deliveryCity}
                isLoading={isLoading}
                onSelect={sendMessage}
                onCheckout={() => setCheckoutOpen(true)}
              />
              {isLoading && !isStreaming && (
                <ThinkingLive
                  steps={liveSteps}
                  showProductSkeleton={showProductSkeleton}
                  liveSummary={liveStepSummary}
                  lastActivityAt={lastStreamActivityAt}
                />
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          <div
            className="relative z-10 shrink-0"
          >
            <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              {cart.length > 0 && (
                <StickyOrderSummary
                  cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                  city={deliveryCity}
                  date={deliveryDate}
                  subtotal={cartSubtotal}
                  currency={cartCurrency}
                  deliveryFee={latestDeliveryInfo?.fee}
                  estimatedTotal={estimatedTotal}
                  budgetAmount={budgetAmount}
                  onCheckout={() => setCheckoutOpen(true)}
                  onCheckDelivery={() =>
                    sendMessage(
                      `Check delivery for my cart to ${deliveryCity ?? "Colombo"} on ${deliveryDate}`
                    )
                  }
                  isBusy={isLoading}
                />
              )}

              {(isLoading || requestHealth === "error") && (
                <ResponseStatusBanner
                  isLoading={isLoading}
                  latestStep={latestLiveStep}
                  errorMessage={lastErrorMessage}
                  canRetry={canRetryLastPrompt}
                  onRetry={() => {
                    if (lastUserPrompt) sendMessage(lastUserPrompt);
                  }}
                  onTryAlternatives={() => sendMessage("Show me alternative gift options in a similar budget")}
                  onContinueWithoutDelivery={() =>
                    sendMessage("Continue without delivery quote and show available gift options")
                  }
                  onCancel={cancelActiveResponse}
                />
              )}

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

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        initialDelivery={{ city: deliveryCity, date: deliveryDate }}
      />
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
        min={getColomboTodayIso()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-[7.6rem] bg-transparent text-xs font-semibold text-white/80 outline-none [color-scheme:dark]"
        aria-label="Delivery date"
      />
    </label>
  );
}

function ResponseStatusBanner({
  isLoading,
  latestStep,
  errorMessage,
  canRetry,
  onRetry,
  onTryAlternatives,
  onContinueWithoutDelivery,
  onCancel,
}: {
  isLoading: boolean;
  latestStep?: string;
  errorMessage?: string | null;
  canRetry: boolean;
  onRetry: () => void;
  onTryAlternatives: () => void;
  onContinueWithoutDelivery: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="mb-2 rounded-xl border px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.06)",
        borderColor: isLoading ? "rgba(248,218,8,0.34)" : "rgba(255,140,140,0.35)",
      }}
    >
      <p className="text-xs text-white/80">
        {isLoading
          ? latestStep ?? "Still checking live availability and delivery details..."
          : errorMessage ?? "Something failed while fetching from Kapruka. Try a quick recovery action."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {isLoading ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            Stop
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onRetry}
              disabled={!canRetry}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold",
                canRetry
                  ? "bg-kap-yellow text-gray-950 hover:brightness-95"
                  : "bg-white/10 text-white/35"
              )}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onTryAlternatives}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/85 transition-colors hover:bg-white/10"
            >
              Try alternatives
            </button>
            <button
              type="button"
              onClick={onContinueWithoutDelivery}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/85 transition-colors hover:bg-white/10"
            >
              Continue without quote
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StickyOrderSummary({
  cartCount,
  city,
  date,
  subtotal,
  deliveryFee,
  estimatedTotal,
  budgetAmount,
  currency,
  onCheckout,
  onCheckDelivery,
  isBusy,
}: {
  cartCount: number;
  city?: string;
  date: string;
  subtotal: number;
  deliveryFee?: number;
  estimatedTotal?: number;
  budgetAmount?: number;
  currency: string;
  onCheckout: () => void;
  onCheckDelivery: () => void;
  isBusy: boolean;
}) {
  return (
    <div
      className="mb-2 rounded-2xl border px-3 py-2.5"
      style={{
        background: "rgba(64,41,112,0.35)",
        borderColor: "rgba(248,218,8,0.28)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/92">
            Order summary ({cartCount} item{cartCount > 1 ? "s" : ""})
          </p>
          <p className="text-[11px] text-white/58">
            {city ? `Deliver to ${city}` : "Select a city"} · {date}
          </p>
          <div className="mt-1 space-y-0.5 text-[11px] text-white/75">
            <p>Items: {formatMoney(subtotal, currency)}</p>
            {deliveryFee !== undefined ? (
              <p>Delivery: {formatMoney(deliveryFee, currency)}</p>
            ) : (
              <p className="text-white/55">Delivery: quote pending</p>
            )}
            {estimatedTotal !== undefined && (
              <p className="font-semibold text-kap-yellow">
                Est. total: {formatMoney(estimatedTotal, currency)}
              </p>
            )}
            {budgetAmount !== undefined && subtotal > budgetAmount && (
              <p className="font-semibold text-amber-300">
                Over budget by {formatMoney(subtotal - budgetAmount, currency)}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={onCheckout}
            className="rounded-full bg-kap-yellow px-3 py-1 text-[11px] font-bold text-gray-950 transition hover:brightness-95"
          >
            Review checkout
          </button>
          <button
            type="button"
            onClick={onCheckDelivery}
            disabled={isBusy}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
              isBusy
                ? "border-white/10 text-white/35"
                : "border-white/20 text-white/85 hover:bg-white/10"
            )}
          >
            Refresh delivery
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
