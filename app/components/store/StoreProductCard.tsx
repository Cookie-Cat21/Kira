"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus } from "lucide-react";
import type { KiraProduct } from "@/types";
import { useCart } from "@/app/context/CartContext";
import { categoryIcon, phClass, formatLKR } from "./storeIcons";
import { cn } from "@/lib/utils";

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
  const Icon = categoryIcon();
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
    <article className="store-card group flex h-full flex-col overflow-hidden rounded-[20px]">
      <Link href={`/product/${product.id}`} className="flex h-full flex-col">
        <div
          ref={imgRef}
          className={cn(
            "store-card-image relative aspect-square w-full overflow-hidden ph-tile",
            !showImage && phClass(categorySlug)
          )}
        >
          {showImage ? (
            <Image
              src={product.image as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="size-9 text-white/25" />
            </div>
          )}

          {product.stockLevel === "Low stock" && (
            <span className="absolute left-2.5 top-2.5 rounded-full liquid-glass-pill px-2 py-0.5 text-[10px] font-medium text-amber-200/90">
              Low stock
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 p-3.5">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug tracking-tight text-white/85">
            {product.name}
          </h3>
          <div className="mt-auto flex items-center justify-between pt-2.5">
            <span className="text-[14px] font-semibold tracking-tight text-white/95">
              {formatLKR(product.price, product.currency)}
            </span>

            {qty === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                aria-label={`Add ${product.name} to cart`}
                className="flex size-7 items-center justify-center rounded-full liquid-glass-pill text-white/80"
              >
                <Plus className="size-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 rounded-full liquid-glass-pill px-1 py-0.5">
                <button
                  type="button"
                  onClick={(e) => step(e, qty - 1)}
                  aria-label="Decrease quantity"
                  className="flex size-5 items-center justify-center rounded-full text-white/75 active:scale-90"
                >
                  <Minus className="size-2.5" />
                </button>
                <span className="min-w-3.5 text-center text-[11px] font-semibold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={(e) => step(e, qty + 1)}
                  aria-label="Increase quantity"
                  className="flex size-5 items-center justify-center rounded-full text-white/75 active:scale-90"
                >
                  <Plus className="size-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
      {qty > 0 && (
        <div className="flex items-center justify-center gap-1 border-t border-white/6 bg-white/[0.03] py-1.5 text-[10px] font-medium tracking-wide text-white/50">
          <Check className="size-2.5" /> In bag
        </div>
      )}
    </article>
  );
}
