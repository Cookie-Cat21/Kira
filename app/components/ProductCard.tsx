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

  const city = deliveryInfo?.city ?? deliveryCity;
  const fee = deliveryInfo?.fee;
  const perishable = deliveryInfo?.perishable;

  const deliveryUnavailable = deliveryInfo && !deliveryInfo.available;

  function flyToCart() {
    if (!imgRef.current || !product.image) return;
    triggerFly(imgRef.current.getBoundingClientRect(), product.image);
  }

  function handleAddToCart() {
    onAddToCart(product);
    flyToCart();
  }

  return (
    <article
      className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl transition-shadow hover:shadow-[0_8px_32px_rgba(64,41,112,0.4)]"
      style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {/* Image */}
      <button
        ref={imgRef}
        type="button"
        onClick={() => onOpenProduct?.(product)}
        aria-label={`View details for ${product.name}`}
        className="group relative aspect-square w-full overflow-hidden text-left"
        style={{ background: "rgba(255,255,255,0.05)" }}
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
        {product.category && (
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
          className="line-clamp-2 text-left text-sm font-semibold leading-tight text-white/85 transition-colors hover:text-white"
        >
          {product.name}
        </button>
        <p className="text-sm font-bold text-kap-yellow">{formattedPrice}</p>

        {city && (
          <div className="flex flex-col gap-0.5">
            <p
              className={cn(
                "text-[10px] font-medium flex items-center gap-0.5",
                deliveryUnavailable ? "text-amber-700" : "text-emerald-600"
              )}
            >
              {deliveryUnavailable ? (
                <AlertCircle className="size-3" />
              ) : (
                <Check className="size-3" />
              )}
              {deliveryUnavailable ? "Next available" : "Delivers"} to {city}
            </p>
            {deliveryInfo?.nextAvailableDate && (
              <p className="text-[10px] text-white/40 pl-3.5">
                {deliveryInfo.nextAvailableDate}
              </p>
            )}
            {fee !== undefined && (
              <p className="text-[10px] text-white/40 pl-3.5">
                + LKR {fee.toLocaleString()} delivery
              </p>
            )}
            {deliveryInfo?.perishableWarning && (
              <p className="text-[10px] text-amber-700 pl-3.5 line-clamp-2">
                {deliveryInfo.perishableWarning}
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
      className="flex w-56 shrink-0 animate-pulse flex-col overflow-hidden rounded-xl"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="aspect-square" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 rounded-full w-11/12" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-3 rounded-full w-8/12" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-4 rounded-full w-5/12" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="mt-1 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}
