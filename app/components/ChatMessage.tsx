"use client";

import ProductCard from "./ProductCard";
import type { KiraMessage, KiraProduct, CartItem } from "@/types";

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

  if (!isKira) {
    return (
      <div className="flex justify-end mb-3 animate-fade-up">
        <div className="bg-kira-bubble-user text-kira-text rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-4 animate-fade-up">
      {/* Kira avatar */}
      <div className="w-7 h-7 rounded-full bg-kap-purple flex items-center justify-center shrink-0 text-xs text-kira-yellow font-bold shadow-md shadow-kap-purple/40">
        ✦
      </div>

      <div className="flex flex-col gap-3 max-w-[88%]">
        {/* Text bubble */}
        {message.content && (
          <div className="bg-kira-bubble-kira border border-kira-border text-kira-text rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Product cards carousel */}
        {message.products && message.products.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mr-4 pr-4">
            {message.products.map((product, i) => (
              <div
                key={product.id}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
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

        {/* Pay link */}
        {message.payLink && (
          <a
            href={message.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-kira-yellow text-gray-900 text-sm font-bold px-5 py-3 rounded-xl text-center hover:brightness-95 transition-all active:scale-95 shadow-md shadow-kira-yellow/20"
          >
            Complete payment →
          </a>
        )}
      </div>
    </div>
  );
}
