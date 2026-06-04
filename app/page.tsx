"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ShoppingCart, X } from "lucide-react";
import ChatMessage from "./components/ChatMessage";
import { ThinkingLive, ThinkingDone } from "./components/ThinkingBlock";
import {
  ChatInput,
  ChatInputTextArea,
  ChatInputSubmit,
} from "./components/ui/chat-input";
import { getContextualGreeting } from "@/lib/kira-prompt";
import type { KiraMessage, CartItem, KiraProduct, DeliveryQuote, OrderTracking } from "@/types";
import { cn } from "@/lib/utils";

const OCCASION_CHIPS = [
  { label: "🎁 Father's Day", value: "I need a Father's Day gift for my dad" },
  { label: "🎂 Birthday gift", value: "I need to send a birthday gift" },
  { label: "💐 Flowers & cake", value: "I want to send flowers and a cake" },
  { label: "🛍️ Just browsing", value: "What's popular on Kapruka right now?" },
  { label: "📦 Track an order", value: "I want to track my order" },
];

// Fast-path city hint — server will canonicalise via kapruka_list_delivery_cities
const CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

const CATEGORIES = [
  { icon: "🎂", label: "Cakes" },
  { icon: "💐", label: "Flowers" },
  { icon: "🍫", label: "Chocolates" },
  { icon: "📱", label: "Electronics" },
  { icon: "👗", label: "Fashion" },
  { icon: "🧺", label: "Hampers" },
];

function buildOpeningMessage(): KiraMessage {
  const greeting = getContextualGreeting();
  return {
    id: "opening",
    role: "assistant",
    content: `${greeting} 👋 Shopping for someone special, or just browsing?`,
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const thinkingStartRef = useRef<number>(0);
  const streamingMsgIdRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleAddToCart = useCallback((product: KiraProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [...prev, { product, quantity: 1 }];
    });
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 400);
  }, []);

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
      setInput("");
      setIsLoading(true);
      setIsStreaming(false);
      streamingMsgIdRef.current = null;
      thinkingStartRef.current = Date.now();

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

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, cart, deliveryCity }),
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

              if (payload.t === "token") {
                if (!streamingMsgIdRef.current) {
                  const msgId = `kira-${Date.now()}`;
                  streamingMsgIdRef.current = msgId;
                  setIsStreaming(true);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: msgId,
                      role: "assistant",
                      content: payload.v as string,
                      timestamp: Date.now(),
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
                if (id)
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? { ...m, products: payload.v as KiraProduct[] }
                        : m
                    )
                  );
              } else if (payload.t === "delivery") {
                const info = payload.v as DeliveryQuote;
                if (info?.city) setDeliveryCity(info.city);
                const id = streamingMsgIdRef.current;
                if (id)
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id ? { ...m, deliveryInfo: info } : m
                    )
                  );
              } else if (payload.t === "tracking") {
                const id = streamingMsgIdRef.current;
                if (id)
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? { ...m, tracking: payload.v as OrderTracking }
                        : m
                    )
                  );
              } else if (payload.t === "payLink") {
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
                if (id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? {
                            ...m,
                            thinkingMs: Date.now() - thinkingStartRef.current,
                          }
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
                      thinkingMs: Date.now() - thinkingStartRef.current,
                    },
                  ]);
                }
                setIsLoading(false);
                setIsStreaming(false);
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
              }
            } catch {
              /* malformed SSE chunk — skip */
            }
          }
        }
      } catch {
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
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [messages, cart, deliveryCity, isLoading]
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const isOnlyOpening = messages.length === 1 && messages[0].id === "opening";

  return (
    <div className="h-screen flex flex-col bg-kira-bg overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 flex items-center justify-between px-4 bg-white border-b border-kira-border shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-kap-yellow text-lg leading-none drop-shadow-sm">✦</span>
          <span className="font-display text-xl text-kira-text tracking-wide">Kira</span>
          <span className="text-[10px] font-semibold text-kira-muted bg-kira-bg border border-kira-border px-2 py-0.5 rounded-full ml-0.5">
            by kapruka
          </span>
        </div>

        {cartCount > 0 ? (
          <button
            onClick={() => setCartOpen((o) => !o)}
            aria-label={`${cartOpen ? "Close" : "Open"} cart — ${cartCount} item${cartCount === 1 ? "" : "s"}, total LKR ${cartTotal.toLocaleString()}`}
            aria-expanded={cartOpen}
            className={cn(
              "flex items-center gap-1.5 bg-kap-yellow text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full transition-transform shadow-sm",
              cartBounce ? "scale-110" : "scale-100"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {cartCount} · LKR {new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(cartTotal)}
          </button>
        ) : (
          <span className="text-kira-muted text-xs">Free delivery ✓</span>
        )}
      </header>

      {/* ── Cart drawer ────────────────────────────────────────────── */}
      {cartOpen && cartCount > 0 && (
        <div
          role="region"
          aria-label="Your cart"
          className="shrink-0 bg-white border-b border-kira-border px-4 py-3 animate-fade-up shadow-sm z-10"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-kira-muted">
              Your cart
            </p>
            <button onClick={() => setCartOpen(false)} aria-label="Close cart">
              <X className="w-3.5 h-3.5 text-kira-muted hover:text-kira-text" />
            </button>
          </div>
          {cart.map((item) => (
            <div key={item.product.id} className="flex justify-between items-center text-sm text-kira-text py-1">
              <span className="truncate mr-3">{item.product.name}</span>
              <span className="shrink-0 text-xs text-kira-muted">
                ×{item.quantity} · <span className="text-kira-text font-semibold">LKR {(item.product.price * item.quantity).toLocaleString()}</span>
              </span>
            </div>
          ))}
          <button
            onClick={() => {
              setCartOpen(false);
              sendMessage("I'm ready to checkout. Can you help me complete the order?");
            }}
            className="mt-3 w-full bg-kap-yellow text-gray-900 text-sm font-bold py-2.5 rounded-xl hover:brightness-95 transition-all shadow-sm"
          >
            Checkout →
          </button>
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────── */}
      <main
        role="log"
        aria-live="polite"
        aria-label="Conversation with Kira"
        className="flex-1 overflow-y-auto px-4 py-4 dot-grid"
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "assistant" && msg.thinkingMs && (
              <ThinkingDone thinkingMs={msg.thinkingMs} />
            )}
            <ChatMessage
              message={msg}
              cart={cart}
              onAddToCart={handleAddToCart}
              deliveryCity={deliveryCity}
            />
          </div>
        ))}
        {isLoading && !isStreaming && <ThinkingLive />}
        <div ref={bottomRef} />
      </main>

      {/* ── Opening prompts ─────────────────────────────────────────── */}
      {isOnlyOpening && (
        <div className="shrink-0 px-4 pb-2 pt-1 space-y-2 bg-kira-bg border-t border-kira-border">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {OCCASION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.value)}
                className="shrink-0 text-xs font-semibold text-kira-text-2 bg-white border border-kira-border px-3 py-1.5 rounded-full hover:border-kap-purple hover:text-kap-purple transition-colors shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => sendMessage(`Show me ${cat.label.toLowerCase()} on Kapruka`)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-kira-border hover:border-kap-purple hover:text-kap-purple transition-colors text-kira-muted group shadow-sm"
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="text-[11px] font-medium group-hover:text-kap-purple transition-colors">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Chat input ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-3 bg-white border-t border-kira-border">
        <ChatInput
          value={input}
          setValue={setInput}
          isLoading={isLoading}
          onSubmit={sendMessage}
        >
          <ChatInputTextArea placeholder="Message Kira..." />
          <ChatInputSubmit />
        </ChatInput>
        <p className="text-center text-kira-muted text-[10px] mt-2">
          Powered by{" "}
          <a href="https://www.kapruka.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-kap-purple transition-colors">
            Kapruka
          </a>
          {" · "}Live products · Real checkout
        </p>
      </div>
    </div>
  );
}
