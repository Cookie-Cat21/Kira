"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { KiraProduct, CartItem, DeliveryQuote } from "@/types";
import { ShoppingCart, Check, AlertCircle, Eye, Gift, Minus, Plus } from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: KiraProduct;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  onOpenProduct?: (product: KiraProduct) => void;
  deliveryCity?: string;
  deliveryInfo?: DeliveryQuote;
}

export default function ProductCard({
  product,
  cart,
  onAddToCart,
  onOpenProduct,
  deliveryCity,
  deliveryInfo,
}: ProductCardProps) {
  const inCart = cart.some((i) => i.product.id === product.id);
  const qty = cart.find((i) => i.product.id === product.id)?.quantity ?? 0;
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLButtonElement | null>(null);
  const { triggerFly, updateQty } = useCart();

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

  function flyToCart() {
    if (!imgRef.current || !product.image) return;
    triggerFly(imgRef.current.getBoundingClientRect(), product.image);
  }

  function handleAddToCart() {
    onAddToCart(product);
    flyToCart();
  }

  return (
    <article className="store-card flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl">
      {/* Image */}
      <button
        ref={imgRef}
        type="button"
        onClick={() => onOpenProduct?.(product)}
        aria-label={`View details for ${product.name}`}
        className="group relative aspect-square w-full overflow-hidden bg-[#f5f5f7] text-left"
      >
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="224px"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-kira-muted">
            <Gift className="size-8" />
          </div>
        )}
        {product.category && product.category.toLowerCase() !== "general" && (
          <span className="absolute left-2 top-2 rounded-md bg-kap-purple px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            {product.category}
          </span>
        )}
        {perishable && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-amber-300 px-2 py-1 text-[10px] font-bold text-gray-950 shadow-sm">
            <AlertCircle className="size-3" />
            Fresh
          </span>
        )}
        {onOpenProduct && (
          <span
            className="absolute bottom-2 right-2 flex size-8 translate-y-1 items-center justify-center rounded-md text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
            style={{ background: "rgba(64,41,112,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Eye className="size-4" />
          </span>
        )}
      </button>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          type="button"
          onClick={() => onOpenProduct?.(product)}
          className="line-clamp-2 text-left text-[15px] font-semibold leading-tight text-kira-text transition-colors hover:text-kap-purple"
        >
          {product.name}
        </button>
        <p className="text-[15px] font-bold text-kap-purple">{formattedPrice}</p>

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
            <p
              className={cn(
                "text-[10px] font-medium flex items-center gap-0.5",
                deliveryUnavailable ? "text-amber-400" : "text-emerald-400"
              )}
            >
              {deliveryUnavailable ? (
                <AlertCircle className="size-3" />
              ) : (
                <Check className="size-3" />
              )}
              {deliveryUnavailable ? "Next available" : "Delivers"} to {city}
            </p>
            {effectiveDeliveryInfo?.nextAvailableDate && (
              <p className="pl-4 text-[10px] text-kira-muted">
                {effectiveDeliveryInfo.nextAvailableDate}
              </p>
            )}
            {fee !== undefined && (
              <p className="pl-4 text-[10px] text-kira-muted">
                + LKR {fee.toLocaleString()} delivery
              </p>
            )}
            {effectiveDeliveryInfo?.perishableWarning && (
              <p className="text-[10px] text-amber-400 pl-3.5 line-clamp-2">
                {effectiveDeliveryInfo.perishableWarning}
              </p>
            )}
          </div>
        )}

        {inCart ? (
          <div className="mt-auto flex items-center justify-between rounded-lg border border-kap-yellow/20 bg-kap-yellow/10 p-1">
            <button
              type="button"
              onClick={() => updateQty(product.id, qty - 1)}
              aria-label={`Decrease quantity for ${product.name}`}
              className="flex size-7 items-center justify-center rounded-md text-kap-yellow transition-colors hover:bg-kap-yellow/10"
            >
              <Minus className="size-3" />
            </button>
            <span className="text-xs font-bold text-kap-yellow">
              {qty} in tray
            </span>
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Increase quantity for ${product.name}`}
              className="flex size-7 items-center justify-center rounded-md text-kap-yellow transition-colors hover:bg-kap-yellow/10"
            >
              <Plus className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg bg-kap-yellow py-2 text-xs font-bold text-gray-950 shadow-sm transition-all hover:brightness-95 active:scale-95"
          >
            <ShoppingCart className="size-3" /> Add to tray
          </button>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="shimmer aspect-square" />
      <div className="flex flex-col gap-2 p-3">
        <div className="shimmer h-3 rounded-full w-11/12" />
        <div className="shimmer h-3 rounded-full w-8/12" style={{ animationDelay: "0.1s" }} />
        <div className="shimmer h-4 rounded-full w-5/12" style={{ animationDelay: "0.2s" }} />
        <div className="shimmer mt-1 h-8 rounded-lg" style={{ animationDelay: "0.15s" }} />
      </div>
    </div>
  );
}
