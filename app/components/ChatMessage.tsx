"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ProductCard from "./ProductCard";
import OrderTracker from "./OrderTracker";
import type { KiraMessage, KiraProduct, CartItem } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChatMessageProps {
  message: KiraMessage;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  deliveryCity?: string;
}

function ProductCarousel({
  message,
  cart,
  onAddToCart,
  deliveryCity,
}: ChatMessageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    // Defer to next frame so the browser has finished layout before measuring
    const raf = requestAnimationFrame(() => checkScroll());
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener("scroll", checkScroll);
    };
  }, [message.products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -196 : 196, behavior: "smooth" });
  };

  if (!message.products?.length) return null;

  return (
    <div className="relative max-w-full overflow-hidden">
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-kira-border shadow-md flex items-center justify-center hover:bg-kap-purple hover:text-white hover:border-kap-purple transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        role="list"
        aria-label={`${message.products.length} product suggestions`}
        className="flex gap-3 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={checkScroll}
      >
        {message.products.map((product, i) => (
          <div
            key={product.id}
            role="listitem"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <ProductCard
              product={product}
              cart={cart}
              onAddToCart={onAddToCart}
              deliveryCity={deliveryCity}
              deliveryInfo={message.deliveryInfo}
            />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      {canRight && (
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-kira-border shadow-md flex items-center justify-center hover:bg-kap-purple hover:text-white hover:border-kap-purple transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
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
        <div className="bg-kap-purple text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

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

        {/* Product cards carousel with arrows */}
        {message.products && message.products.length > 0 && (
          <ProductCarousel
            message={message}
            cart={cart}
            onAddToCart={onAddToCart}
            deliveryCity={deliveryCity}
          />
        )}

        {/* Order tracking timeline */}
        {message.tracking && <OrderTracker tracking={message.tracking} />}

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
