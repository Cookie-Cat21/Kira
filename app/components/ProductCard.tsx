"use client";

import { useState } from "react";
import Image from "next/image";
import type { KiraProduct, CartItem, DeliveryQuote } from "@/types";
import { ShoppingCart, Check, AlertCircle, Eye } from "lucide-react";
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

  const formattedPrice = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: product.currency ?? "LKR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const city = deliveryInfo?.city ?? deliveryCity;
  const fee = deliveryInfo?.fee;
  const perishable = deliveryInfo?.perishable;

  const deliveryUnavailable = deliveryInfo && !deliveryInfo.available;

  return (
    <article className="bg-white rounded-2xl overflow-hidden flex flex-col w-44 shrink-0 animate-pop-in border border-kira-border shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <button
        type="button"
        onClick={() => onOpenProduct?.(product)}
        aria-label={`View details for ${product.name}`}
        className="aspect-square bg-[#f7f5fc] overflow-hidden relative text-left w-full group"
      >
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="176px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-kira-muted">
            🛍️
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold bg-kap-purple text-white px-2 py-0.5 rounded-full shadow-sm">
            {product.category}
          </span>
        )}
        {perishable && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-amber-400 text-gray-900 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" />
            Fresh
          </span>
        )}
        {onOpenProduct && (
          <span className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-white/95 text-kap-purple shadow-sm flex items-center justify-center opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0">
            <Eye className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Details */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <button
          type="button"
          onClick={() => onOpenProduct?.(product)}
          className="text-kira-text text-xs font-semibold leading-tight line-clamp-2 text-left hover:text-kap-purple transition-colors"
        >
          {product.name}
        </button>
        <p className="text-kap-purple font-bold text-sm">{formattedPrice}</p>

        {city && (
          <div className="flex flex-col gap-0.5">
            <p
              className={cn(
                "text-[10px] font-medium flex items-center gap-0.5",
                deliveryUnavailable ? "text-amber-700" : "text-emerald-600"
              )}
            >
              {deliveryUnavailable ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {deliveryUnavailable ? "Next available" : "Delivers"} to {city}
            </p>
            {deliveryInfo?.nextAvailableDate && (
              <p className="text-[10px] text-kira-muted pl-3.5">
                {deliveryInfo.nextAvailableDate}
              </p>
            )}
            {fee !== undefined && (
              <p className="text-[10px] text-kira-muted pl-3.5">
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

        <button
          onClick={() => onAddToCart(product)}
          className={cn(
            "mt-auto w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95",
            inCart
              ? "bg-kap-purple/10 text-kap-purple border border-kap-purple/20"
              : "bg-kap-yellow text-gray-900 hover:brightness-95 shadow-sm"
          )}
        >
          {inCart ? (
            <>
              <Check className="w-3 h-3" /> In cart ({qty})
            </>
          ) : (
            <>
              <ShoppingCart className="w-3 h-3" /> Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col w-44 shrink-0 border border-kira-border shadow-sm animate-pulse">
      <div className="aspect-square bg-kira-border/70" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 rounded-full bg-kira-border w-11/12" />
        <div className="h-3 rounded-full bg-kira-border w-8/12" />
        <div className="h-4 rounded-full bg-kira-border w-5/12" />
        <div className="h-8 rounded-xl bg-kira-border/80 mt-1" />
      </div>
    </div>
  );
}
