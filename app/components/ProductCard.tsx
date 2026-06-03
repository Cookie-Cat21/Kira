"use client";

import type { KiraProduct, CartItem } from "@/types";

interface ProductCardProps {
  product: KiraProduct;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  deliveryCity?: string;
}

export default function ProductCard({
  product,
  cart,
  onAddToCart,
  deliveryCity,
}: ProductCardProps) {
  const inCart = cart.some((i) => i.product.id === product.id);
  const qty = cart.find((i) => i.product.id === product.id)?.quantity ?? 0;

  const formattedPrice = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: product.currency ?? "LKR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col w-44 shrink-0 animate-pop-in shadow-lg shadow-black/30">
      {/* Product image */}
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-purple-50">
            🛍️
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold bg-kap-purple text-white px-2 py-0.5 rounded-full">
            {product.category}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 bg-white">
        <p className="text-gray-800 text-xs font-semibold leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="text-kap-purple font-bold text-sm">{formattedPrice}</p>

        {deliveryCity && (
          <p className="text-[10px] text-emerald-600 font-medium">
            ✓ Delivers to {deliveryCity}
          </p>
        )}

        <button
          onClick={() => onAddToCart(product)}
          className={`mt-auto w-full text-xs font-bold py-1.5 rounded-lg transition-all ${
            inCart
              ? "bg-kap-purple/10 text-kap-purple border border-kap-purple/30"
              : "bg-kira-yellow text-gray-900 hover:brightness-95 active:scale-95"
          }`}
        >
          {inCart ? `In cart (${qty})` : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
