"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ProductCard from "./ProductCard";
import OrderTracker from "./OrderTracker";
import type { KiraMessage, KiraProduct, CartItem } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, CreditCard } from "lucide-react";

interface ChatMessageProps {
  message: KiraMessage;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  onOpenProduct?: (product: KiraProduct) => void;
  deliveryCity?: string;
}

function ProductCarousel({
  message,
  cart,
  onAddToCart,
  onOpenProduct,
  deliveryCity,
}: ChatMessageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
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
              onOpenProduct={onOpenProduct}
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
  onOpenProduct,
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
      <div className="w-7 h-7 rounded-full bg-kap-purple shrink-0 shadow-sm overflow-hidden">
        <img src="/kira-logo.svg" alt="Kira" className="w-full h-full object-cover" />
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
            onOpenProduct={onOpenProduct}
            deliveryCity={deliveryCity}
          />
        )}

        {/* Order tracking timeline */}
        {message.tracking && <OrderTracker tracking={message.tracking} />}

        {/* Pay link CTA */}
        {(message.checkout || message.payLink) && (
          <CheckoutCard message={message} />
        )}
      </div>
    </div>
  );
}

function CheckoutCard({ message }: { message: KiraMessage }) {
  const checkoutUrl = message.checkout?.checkoutUrl ?? message.payLink;
  if (!checkoutUrl) return null;

  const summary = message.checkout?.summary;
  return (
    <div className="bg-white border border-kira-border rounded-2xl px-4 py-3 max-w-xs shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-full bg-kap-yellow text-gray-900 flex items-center justify-center">
          <CreditCard className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-kira-text">Checkout ready</p>
          {message.checkout?.orderRef && (
            <p className="text-[10px] font-mono text-kira-muted truncate">
              {message.checkout.orderRef}
            </p>
          )}
        </div>
      </div>

      {summary && (
        <div className="space-y-1 text-xs mb-3">
          {summary.itemsTotal !== undefined && (
            <SummaryRow label="Items" value={formatCurrency(summary.itemsTotal, summary.currency)} />
          )}
          {summary.deliveryFee !== undefined && (
            <SummaryRow label="Delivery" value={formatCurrency(summary.deliveryFee, summary.currency)} />
          )}
          {summary.grandTotal !== undefined && (
            <SummaryRow
              label="Total"
              value={formatCurrency(summary.grandTotal, summary.currency)}
              strong
            />
          )}
        </div>
      )}

      {message.checkout?.expiresAt && (
        <p className="flex items-center gap-1.5 text-[10px] text-kira-muted mb-3">
          <Clock className="h-3 w-3" />
          Link expires {formatExpiry(message.checkout.expiresAt)}
        </p>
      )}

      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-kap-yellow text-gray-900 text-sm font-bold px-5 py-3 rounded-xl text-center hover:brightness-95 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
      >
        Complete payment
        <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        strong ? "font-bold text-kira-text pt-1 border-t border-kira-border" : "text-kira-muted"
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatCurrency(amount: number, currency = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatExpiry(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
