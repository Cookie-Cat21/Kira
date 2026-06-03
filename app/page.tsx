"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./components/ChatMessage";
import TypingIndicator from "./components/TypingIndicator";
import { getContextualGreeting } from "@/lib/kira-prompt";
import type { KiraMessage, CartItem, KiraProduct, ChatResponse } from "@/types";

// Occasion-aware chips — update to match current Sri Lankan calendar
const OCCASION_CHIPS = [
  { label: "🎁 Father's Day", value: "I need a Father's Day gift for my dad" },
  { label: "🎂 Birthday gift", value: "I need to send a birthday gift" },
  { label: "💐 Flowers & cake", value: "I want to send flowers and a cake" },
  { label: "🛍️ Just browsing", value: "What's popular on Kapruka right now?" },
];

// Category shortcuts — mirrors Kapruka's main nav
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryCity, setDeliveryCity] = useState<string | undefined>();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleAddToCart = useCallback((product: KiraProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);
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

      try {
        const history = [...messages, userMsg]
          .filter((m) => m.id !== "opening")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, cart, deliveryCity }),
        });

        if (!res.ok) throw new Error("API error");
        const data: ChatResponse = await res.json();

        // Detect city from user message
        if (!deliveryCity) {
          const cityMatch = trimmed.match(
            /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i
          );
          if (cityMatch) setDeliveryCity(cityMatch[1]);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `kira-${Date.now()}`,
            role: "assistant",
            content: data.message,
            products: data.products,
            payLink: data.payLink,
            timestamp: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Aiyo, something went wrong on my end. Try again?",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, cart, deliveryCity, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isOnlyOpening = messages.length === 1 && messages[0].id === "opening";

  return (
    <div className="h-screen flex flex-col bg-kira-base overflow-hidden">
      {/* Subtle radial glow behind the UI */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #402970 0%, transparent 70%)",
        }}
      />

      {/* ── Header ── */}
      <header className="relative shrink-0 h-14 flex items-center justify-between px-4 border-b border-kira-border bg-kira-base/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-kira-yellow text-lg leading-none">✦</span>
          <span className="font-display text-xl text-kira-text tracking-wide">
            Kira
          </span>
          <span className="text-[10px] font-semibold text-kira-muted bg-kira-surface border border-kira-border px-2 py-0.5 rounded-full ml-1">
            by kapruka
          </span>
        </div>

        {cartCount > 0 ? (
          <button
            onClick={() => setCartOpen((o) => !o)}
            className={`flex items-center gap-1.5 bg-kira-yellow text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full transition-transform ${cartBounce ? "scale-110" : "scale-100"}`}
          >
            <span>🛒</span>
            <span>
              {cartCount} · LKR{" "}
              {new Intl.NumberFormat("en-LK", {
                maximumFractionDigits: 0,
              }).format(cartTotal)}
            </span>
          </button>
        ) : (
          <span className="text-kira-muted text-xs">Free delivery available</span>
        )}
      </header>

      {/* ── Cart drawer ── */}
      {cartOpen && cartCount > 0 && (
        <div className="relative shrink-0 bg-kira-surface border-b border-kira-border px-4 py-3 animate-fade-up z-10">
          <p className="text-kira-muted text-[10px] uppercase tracking-widest mb-2 font-semibold">
            Cart
          </p>
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center text-sm text-kira-text py-1"
            >
              <span className="truncate mr-3">{item.product.name}</span>
              <span className="text-kira-muted shrink-0 text-xs">
                ×{item.quantity} ·{" "}
                <span className="text-kira-text font-semibold">
                  LKR {(item.product.price * item.quantity).toLocaleString()}
                </span>
              </span>
            </div>
          ))}
          <button
            onClick={() => {
              setCartOpen(false);
              sendMessage("I'm ready to checkout. Can you help me complete the order?");
            }}
            className="mt-3 w-full bg-kira-yellow text-gray-900 text-sm font-bold py-2.5 rounded-xl hover:brightness-95 transition-all"
          >
            Checkout →
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <main className="relative flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            cart={cart}
            onAddToCart={handleAddToCart}
            deliveryCity={deliveryCity}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </main>

      {/* ── Opening prompts (only before first user message) ── */}
      {isOnlyOpening && (
        <div className="relative shrink-0 px-4 pb-2 space-y-2 z-10">
          {/* Occasion chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {OCCASION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.value)}
                className="shrink-0 text-xs font-semibold text-kira-text bg-kira-surface border border-kira-border px-3 py-2 rounded-full hover:border-kira-yellow/60 hover:text-kira-yellow transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Category grid */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() =>
                  sendMessage(`Show me ${cat.label.toLowerCase()} on Kapruka`)
                }
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kira-surface border border-kira-border hover:border-kira-yellow/40 hover:text-kira-yellow transition-colors group"
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="text-[11px] font-medium text-kira-muted group-hover:text-kira-yellow transition-colors">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="relative shrink-0 px-4 pb-4 pt-2 border-t border-kira-border bg-kira-base z-10">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Kira..."
            rows={1}
            className="flex-1 bg-kira-surface border border-kira-border text-kira-text placeholder-kira-muted text-sm rounded-2xl px-4 py-3 resize-none outline-none focus:border-kira-border-bright transition-colors leading-relaxed"
            style={{
              maxHeight: "120px",
              overflowY: input.split("\n").length > 3 ? "auto" : "hidden",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-11 h-11 rounded-2xl bg-kira-yellow flex items-center justify-center hover:brightness-95 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-kira-yellow/20"
            aria-label="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 text-gray-900"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-kira-muted text-[10px] mt-1.5">
          Powered by{" "}
          <a
            href="https://www.kapruka.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-kira-text transition-colors font-semibold"
          >
            Kapruka
          </a>
          {" · "}Live products · Real checkout
        </p>
      </div>
    </div>
  );
}
