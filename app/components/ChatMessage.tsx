"use client";

/**
 * ChatMessage — inspired by jakobhoeg/chat-bubble on 21st.dev
 * Clean bubbles: Kira on left (lavender bg), user on right (Kapruka purple).
 */

import ReactMarkdown from "react-markdown";
import ProductCard from "./ProductCard";
import type { KiraMessage, KiraProduct, CartItem } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: KiraMessage;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  deliveryCity?: string;
}

export default function ChatMessage({
  message,
  cart,
  onAddToCart,
  deliveryCity,
}: ChatMessageProps) {
  const isKira = message.role === "assistant";

  /* ── User bubble ─────────────────────────────────────────────── */
  if (!isKira) {
    return (
      <div className="flex justify-end mb-3 animate-fade-up">
        <div className="bg-kap-purple text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  /* ── Kira bubble ─────────────────────────────────────────────── */
  return (
    <div className="flex items-end gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-kap-purple flex items-center justify-center shrink-0 text-xs text-kap-yellow shadow-sm">
        ✦
      </div>

      <div className="flex flex-col gap-3 max-w-[88%]">
        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "bg-kira-bubble-kira border border-kira-border text-kira-text",
              "rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              "prose prose-sm max-w-none",
              "[&_strong]:font-semibold [&_strong]:text-kira-text",
              "[&_ol]:pl-4 [&_ol]:space-y-1 [&_ul]:pl-4 [&_ul]:space-y-1",
              "[&_p]:m-0 [&_p+p]:mt-2"
            )}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Product cards carousel */}
        {message.products && message.products.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mr-4 pr-4">
            {message.products.map((product, i) => (
              <div key={product.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <ProductCard
                  product={product}
                  cart={cart}
                  onAddToCart={onAddToCart}
                  deliveryCity={deliveryCity}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pay link CTA */}
        {message.payLink && (
          <a
            href={message.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-kap-yellow text-gray-900 text-sm font-bold px-5 py-3 rounded-xl text-center hover:brightness-95 transition-all active:scale-95 shadow-sm"
          >
            Complete payment →
          </a>
        )}
      </div>
    </div>
  );
}
