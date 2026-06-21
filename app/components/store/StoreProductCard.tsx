"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus } from "lucide-react";
import type { KiraProduct } from "@/types";
import { useCart } from "@/app/context/CartContext";
import { categoryIcon, phClass, formatLKR } from "./storeIcons";
import { cn } from "@/lib/utils";

const PlaceholderIcon = categoryIcon();

export default function StoreProductCard({
  product,
  categorySlug,
  priority = false,
}: {
  product: KiraProduct;
  categorySlug?: string;
  priority?: boolean;
}) {
  const { cart, addToCart, updateQty, triggerFly } = useCart();
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLDivElement | null>(null);

  const inCart = cart.find((i) => i.product.id === product.id);
  const qty = inCart?.quantity ?? 0;
  const showImage = Boolean(product.image) && !imgError;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    if (imgRef.current && product.image) {
      triggerFly(imgRef.current.getBoundingClientRect(), product.image);
    }
  }

  function step(e: React.MouseEvent, next: number) {
    e.preventDefault();
    e.stopPropagation();
    updateQty(product.id, next);
  }

  return (
    <article className="store-card group flex h-full flex-col overflow-hidden rounded-2xl">
      <Link href={`/product/${product.id}`} className="flex h-full flex-col">
        {/* Image */}
        <div
          ref={imgRef}
          className={cn(
            "relative aspect-square w-full overflow-hidden ph-tile",
            !showImage && phClass(categorySlug)
          )}
        >
          {showImage ? (
            <Image
              src={product.image as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlaceholderIcon className="size-10 text-white/30" />
            </div>
          )}

          {product.stockLevel === "Low stock" && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-amber-800 shadow-sm">
              Low stock
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-kira-text">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between pt-2">
            <span className="text-[15px] font-semibold tracking-tight text-kira-text">
              {formatLKR(product.price, product.currency)}
            </span>

            {qty === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                aria-label={`Add ${product.name} to cart`}
                className="flex size-11 items-center justify-center rounded-full bg-kap-purple text-white transition-colors hover:bg-kap-purple/90 active:scale-95"
              >
                <Plus className="size-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1 rounded-full border border-kira-border bg-[#f5f5f7] px-1 py-1">
                <button
                  type="button"
                  onClick={(e) => step(e, qty - 1)}
                  aria-label="Decrease quantity"
                  className="flex size-9 items-center justify-center rounded-full text-kira-text hover:bg-white"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-5 text-center text-sm font-semibold text-kira-text">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={(e) => step(e, qty + 1)}
                  aria-label="Increase quantity"
                  className="flex size-9 items-center justify-center rounded-full text-kira-text hover:bg-white"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
      {qty > 0 && (
        <div className="flex items-center justify-center gap-1 border-t border-kira-border bg-emerald-50 py-2 text-[13px] font-medium text-emerald-700">
          <Check className="size-3" /> In your bag
        </div>
      )}
    </article>
  );
}
