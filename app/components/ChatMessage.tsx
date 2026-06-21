"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import ProductCard from "./ProductCard";
import OrderTracker from "./OrderTracker";
import { useCart } from "@/app/context/CartContext";
import type { KiraMessage, KiraProduct, CartItem, DeliveryQuote, OrderTracking } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, CreditCard, Check, AlertCircle, Eye, ShoppingCart, Minus, Plus, Gift } from "lucide-react";

interface ChatMessageProps {
  message: KiraMessage;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  onOpenProduct?: (product: KiraProduct) => void;
  onReorderFromTracking?: (tracking: OrderTracking) => void;
  deliveryCity?: string;
}

interface HeroProps {
  product: KiraProduct;
  cart: CartItem[];
  onAddToCart: (p: KiraProduct) => void;
  onOpenProduct?: (p: KiraProduct) => void;
  deliveryCity?: string;
  deliveryInfo?: DeliveryQuote;
}

function ProductHero({ product, cart, onAddToCart, onOpenProduct, deliveryCity, deliveryInfo }: HeroProps) {
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLButtonElement | null>(null);
  const { triggerFly, updateQty } = useCart();
  const inCart = cart.some((i) => i.product.id === product.id);
  const qty = cart.find((i) => i.product.id === product.id)?.quantity ?? 0;

  const formattedPrice = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: product.currency ?? "LKR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const effectiveDeliveryInfo = product.deliveryInfo ?? deliveryInfo;
  const city = effectiveDeliveryInfo?.city ?? deliveryCity;
  const fee = effectiveDeliveryInfo?.fee;
  const perishable = effectiveDeliveryInfo?.perishable;
  const deliveryUnavailable = effectiveDeliveryInfo && !effectiveDeliveryInfo.available;

  function handleAddToCart() {
    onAddToCart(product);
    if (imgRef.current && product.image) {
      triggerFly(imgRef.current.getBoundingClientRect(), product.image);
    }
  }

  return (
    <article className="store-card animate-fade-up flex w-full max-w-sm overflow-hidden rounded-2xl transition-shadow hover:shadow-md">
      {/* Image */}
      <button
        ref={imgRef}
        type="button"
        onClick={() => onOpenProduct?.(product)}
        aria-label={`View details for ${product.name}`}
        className="group relative size-36 shrink-0 overflow-hidden bg-kira-bg sm:size-48 min-h-36 sm:min-h-48"
      >
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="176px"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-kira-muted">
            <Gift className="size-10" />
          </div>
        )}
        {perishable && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-gray-950">
            <AlertCircle className="size-3" /> Fresh
          </span>
        )}
        {onOpenProduct && (
          <span className="absolute inset-0 flex items-center justify-center bg-kap-purple/20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Eye className="size-6 text-kap-purple" />
          </span>
        )}
      </button>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && product.category.toLowerCase() !== "general" && (
          <span className="w-fit rounded-md bg-kap-purple px-2 py-0.5 text-[10px] font-bold text-white">
            {product.category}
          </span>
        )}
        <button
          type="button"
          onClick={() => onOpenProduct?.(product)}
          className="line-clamp-3 text-left text-sm font-semibold leading-snug text-kira-text transition-colors hover:text-kap-purple"
        >
          {product.name}
        </button>
        <p className="text-base font-bold text-kap-purple">{formattedPrice}</p>

        {product.badges && product.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.badges.slice(0, 4).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-kap-yellow/20 bg-kap-yellow/10 px-2 py-0.5 text-[10px] font-semibold text-kap-yellow/90"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {city && (
          <div className="flex flex-col gap-0.5">
            <p className={cn("flex items-center gap-1 text-[11px] font-medium", deliveryUnavailable ? "text-amber-700" : "text-emerald-700")}>
              {deliveryUnavailable ? <AlertCircle className="size-3" /> : <Check className="size-3" />}
              {deliveryUnavailable ? "Next available" : "Delivers"} to {city}
            </p>
            {effectiveDeliveryInfo?.nextAvailableDate && (
              <p className="pl-4 text-[10px] text-kira-muted">{effectiveDeliveryInfo.nextAvailableDate}</p>
            )}
            {fee !== undefined && (
              <p className="pl-4 text-[10px] text-kira-muted">+ LKR {fee.toLocaleString()} delivery</p>
            )}
          </div>
        )}

        <div className="mt-auto">
          {inCart ? (
            <div className="flex items-center justify-between rounded-lg border border-kap-yellow/20 bg-kap-yellow/10 p-1">
              <button type="button" onClick={() => updateQty(product.id, qty - 1)} aria-label="Decrease" className="flex size-7 items-center justify-center rounded-md text-kap-yellow hover:bg-kap-yellow/10">
                <Minus className="size-3" />
              </button>
              <span className="text-xs font-bold text-kap-yellow">{qty} in tray</span>
              <button type="button" onClick={handleAddToCart} aria-label="Increase" className="flex size-7 items-center justify-center rounded-md text-kap-yellow hover:bg-kap-yellow/10">
                <Plus className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-kap-yellow py-2 text-xs font-bold text-gray-950 transition-all hover:brightness-95 active:scale-95"
            >
              <ShoppingCart className="size-3" /> Add to tray
            </button>
          )}
        </div>
      </div>
    </article>
  );
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

  // Single product gets a hero layout — wider, more prominent
  if (message.products.length === 1) {
    return (
      <ProductHero
        product={message.products[0]}
        cart={cart}
        onAddToCart={onAddToCart}
        onOpenProduct={onOpenProduct}
        deliveryCity={deliveryCity}
        deliveryInfo={message.deliveryInfo}
      />
    );
  }

  return (
    <div className="relative max-w-full overflow-hidden">
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-kira-border bg-white text-kira-text shadow-sm transition-colors hover:bg-kira-bg"
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
            className="animate-fade-up"
            style={{ animationDelay: `${i * 0.07}s`, animationFillMode: "both" }}
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
          className="absolute right-0 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-kira-border bg-white text-kira-text shadow-sm transition-colors hover:bg-kira-bg"
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
  onReorderFromTracking,
  deliveryCity,
}: ChatMessageProps) {
  const isKira = message.role === "assistant";

  if (!isKira) {
    return (
      <div className="flex justify-end mb-3 animate-fade-up">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-kap-purple px-4 py-3 text-[17px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 mb-4 animate-fade-up">
      {/* Avatar */}
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-kira-border bg-white">
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
              "rounded-2xl rounded-tl-md border border-kira-border bg-white px-4 py-3 text-[17px] leading-relaxed text-kira-text shadow-sm",
              "prose prose-sm max-w-none",
              "[&_strong]:font-semibold [&_strong]:text-kira-text",
              "[&_ol]:pl-4 [&_ol]:space-y-1 [&_ul]:pl-4 [&_ul]:space-y-1",
              "[&_p]:m-0 [&_p+p]:mt-2 [&_p]:text-kira-text",
              "[&_li]:text-kira-text"
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
        {message.tracking && (
          <OrderTracker
            tracking={message.tracking}
            onReorder={
              onReorderFromTracking
                ? () => onReorderFromTracking(message.tracking!)
                : undefined
            }
          />
        )}

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
  const [copied, setCopied] = useState(false);
  if (!checkoutUrl) return null;

  const summary = message.checkout?.summary;
  const orderRef = message.checkout?.orderRef;

  async function copyOrderRef() {
    if (!orderRef) return;
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="max-w-xs rounded-2xl border border-kira-border bg-white px-4 py-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-kap-yellow text-gray-950">
          <CreditCard className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-kira-text">Checkout ready</p>
          {orderRef && (
            <div className="flex items-center gap-2">
              <p className="truncate font-mono text-[10px] text-kira-muted">
                Ref: {orderRef}
              </p>
              <button
                type="button"
                onClick={copyOrderRef}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-kap-purple hover:text-kap-purple/80"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          {!orderRef && (
            <p className="text-[10px] text-kira-muted">Save your ref to reorder anytime</p>
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
        <p className="mb-3 flex items-center gap-1.5 text-[10px] text-kira-muted">
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
        strong ? "border-t border-kira-border pt-1 font-bold text-kira-text" : "text-kira-text-2"
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
