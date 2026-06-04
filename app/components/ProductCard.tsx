"use client";

import { useState } from "react";
import type { KiraProduct, CartItem, DeliveryQuote } from "@/types";
import { ShoppingCart, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: KiraProduct;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  deliveryCity?: string;
  deliveryInfo?: DeliveryQuote;
}

export default function ProductCard({
  product,
  cart,
  onAddToCart,
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

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col w-44 shrink-0 animate-pop-in border border-kira-border shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-[#f7f5fc] overflow-hidden relative">
        {product.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
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
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-kira-text text-xs font-semibold leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="text-kap-purple font-bold text-sm">{formattedPrice}</p>

        {city && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
              <Check className="w-3 h-3" />
              Delivers to {city}
            </p>
            {fee !== undefined && (
              <p className="text-[10px] text-kira-muted pl-3.5">
                + LKR {fee.toLocaleString()} delivery
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
    </div>
  );
}
