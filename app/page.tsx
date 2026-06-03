"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./components/ChatMessage";
import TypingIndicator from "./components/TypingIndicator";
import { getContextualGreeting } from "@/lib/kira-prompt";
import type { KiraMessage, CartItem, KiraProduct, ChatResponse } from "@/types";

const QUICK_REPLIES = [
  { label: "🎁 Send a gift", value: "I need to send a gift to someone" },
  { label: "🛍️ Browse deals", value: "What deals does Kapruka have right now?" },
  { label: "💐 Surprise someone", value: "Help me surprise someone special" },
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
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
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

        // Extract delivery city if mentioned in products
        if (data.products && data.products.length > 0 && !deliveryCity) {
          const cityMatch = trimmed.match(
            /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle)\b/i
          );
          if (cityMatch) setDeliveryCity(cityMatch[1]);
        }

        const kiraMsg: KiraMessage = {
          id: `kira-${Date.now()}`,
          role: "assistant",
          content: data.message,
          products: data.products,
          payLink: data.payLink,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, kiraMsg]);
      } catch {
        const errMsg: KiraMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Aiyo, something went wrong on my end. Try again?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
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
  const isOnlyOpening =
    messages.length === 1 && messages[0].id === "opening";

  return (
    <div className="h-full flex flex-col bg-kira-base">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-kira-border bg-kira-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-kira-accent text-lg">✦</span>
          <span className="font-display text-xl text-kira-text tracking-wide">
            Kira
          </span>
        </div>

        {cartCount > 0 && (
          <button
            onClick={() => setCartOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-kira-surface border border-kira-border text-kira-text text-xs font-medium px-3 py-1.5 rounded-full hover:border-kira-accent/50 transition-colors"
          >
            <span>🛒</span>
            <span>
              {cartCount} item{cartCount !== 1 ? "s" : ""} ·{" "}
              {new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
                maximumFractionDigits: 0,
              }).format(cartTotal)}
            </span>
          </button>
        )}
      </header>

      {/* Cart drawer */}
      {cartOpen && cartCount > 0 && (
        <div className="shrink-0 bg-kira-surface border-b border-kira-border px-4 py-3 animate-fade-up">
          <p className="text-kira-muted text-xs mb-2 uppercase tracking-wide">
            Cart
          </p>
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center text-sm text-kira-text py-1"
            >
              <span className="truncate mr-2">{item.product.name}</span>
              <span className="text-kira-muted shrink-0">
                ×{item.quantity}
              </span>
            </div>
          ))}
          <button
            onClick={() => {
              setCartOpen(false);
              sendMessage(
                "I'm ready to checkout. Can you help me complete the order?"
              );
            }}
            className="mt-3 w-full bg-kira-accent text-white text-sm font-semibold py-2 rounded-xl hover:bg-kira-accent/90 transition-colors"
          >
            Checkout →
          </button>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
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

      {/* Quick replies — only on opening */}
      {isOnlyOpening && (
        <div className="shrink-0 px-4 pb-2 flex gap-2 overflow-x-auto">
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.label}
              onClick={() => sendMessage(qr.value)}
              className="shrink-0 text-xs font-medium text-kira-text bg-kira-surface border border-kira-border px-3 py-2 rounded-full hover:border-kira-accent/50 hover:text-kira-accent transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-kira-border bg-kira-base">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Kira..."
            rows={1}
            className="flex-1 bg-kira-surface border border-kira-border text-kira-text placeholder-kira-muted text-sm rounded-2xl px-4 py-3 resize-none outline-none focus:border-kira-accent/50 transition-colors leading-relaxed"
            style={{
              maxHeight: "120px",
              overflowY: input.split("\n").length > 3 ? "auto" : "hidden",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-11 h-11 rounded-2xl bg-kira-accent text-white flex items-center justify-center hover:bg-kira-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-kira-muted text-xs mt-2">
          Powered by{" "}
          <a
            href="https://www.kapruka.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-kira-text transition-colors"
          >
            Kapruka
          </a>
        </p>
      </div>
    </div>
  );
}
