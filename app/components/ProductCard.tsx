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
    <div className="bg-kira-surface border border-kira-border rounded-2xl overflow-hidden flex flex-col w-44 shrink-0 animate-fade-up">
      {/* Product image */}
      <div className="aspect-square bg-kira-surface-2 overflow-hidden">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-kira-muted text-3xl">
            🛍️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-kira-text text-sm font-medium leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="text-kira-accent font-semibold text-sm">{formattedPrice}</p>

        {deliveryCity && (
          <p className="text-xs text-emerald-400">
            ✓ Delivers to {deliveryCity}
          </p>
        )}

        <button
          onClick={() => onAddToCart(product)}
          className={`mt-auto w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${
            inCart
              ? "bg-kira-accent/20 text-kira-accent border border-kira-accent/30"
              : "bg-kira-accent text-white hover:bg-kira-accent/90"
          }`}
        >
          {inCart ? `In cart (${qty})` : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
