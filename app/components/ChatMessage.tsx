"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
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
    el.scrollBy({ left: dir === "left" ? -252 : 252, behavior: "smooth" });
  };

  if (!message.products?.length) return null;

  return (
    <div className="relative max-w-full overflow-hidden">
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition-colors hover:text-white"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <ChevronLeft className="size-4" />
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
          className="absolute right-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition-colors hover:text-white"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <ChevronRight className="size-4" />
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
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white"
          style={{
            background: "linear-gradient(135deg, rgba(64,41,112,0.9), rgba(90,55,160,0.9))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(148,100,255,0.3)",
            boxShadow: "0 4px 24px rgba(64,41,112,0.4)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{
          background: "rgba(64,41,112,0.5)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(248,218,8,0.25)",
        }}
      >
        <Image
          src="/kira-logo.svg"
          alt="Kira"
          width={28}
          height={28}
          className="object-contain"
          style={{ width: "auto", height: "1.75rem" }}
        />
      </div>

      <div className="flex flex-col gap-3 max-w-[88%]">
        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed",
              "prose prose-sm max-w-none",
              "[&_strong]:font-semibold [&_strong]:text-white/90",
              "[&_ol]:pl-4 [&_ol]:space-y-1 [&_ul]:pl-4 [&_ul]:space-y-1",
              "[&_p]:m-0 [&_p+p]:mt-2 [&_p]:text-white/85",
              "[&_li]:text-white/85"
            )}
            style={{
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              color: "rgba(255,255,255,0.85)",
            }}
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
    <div
      className="max-w-xs rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-kap-yellow text-gray-950">
          <CreditCard className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white/90">Checkout ready</p>
          {message.checkout?.orderRef && (
            <p className="text-[10px] font-mono text-white/40 truncate">
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
        <p className="flex items-center gap-1.5 text-[10px] text-white/40 mb-3">
          <Clock className="h-3 w-3" />
          Link expires {formatExpiry(message.checkout.expiresAt)}
        </p>
      )}

      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg bg-kap-yellow px-5 py-3 text-center text-sm font-bold text-gray-950 shadow-sm transition-all hover:brightness-95 active:scale-95"
      >
        Complete payment
        <ChevronRight className="size-4" />
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
        strong ? "font-bold text-white/90 pt-1 border-t border-white/10" : "text-white/45"
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
