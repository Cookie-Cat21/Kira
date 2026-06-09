"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, Sparkles, Truck, ShieldCheck } from "lucide-react";
import type { KiraProductDetails } from "@/types";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { categoryIcon, formatLKR, phClass } from "./storeIcons";
import { cn } from "@/lib/utils";

export default function ProductDetailClient({
  product,
}: {
  product: KiraProductDetails;
}) {
  const { cart, addToCart, updateQty, triggerFly, openCart } = useCart();
  const { open: openKira } = useKiraDock();
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLDivElement | null>(null);

  const inCart = cart.find((i) => i.product.id === product.id);
  const qty = inCart?.quantity ?? 0;
  const Icon = categoryIcon();
  const hero = product.images?.[0] ?? product.image;
  const showImage = Boolean(hero) && !imgError;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  function handleAdd() {
    addToCart(product);
    if (imgRef.current && hero) {
      triggerFly(imgRef.current.getBoundingClientRect(), hero);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" /> Continue shopping
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Image */}
        <div
          ref={imgRef}
          className={cn(
            "ph-tile relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10",
            !showImage && phClass()
          )}
        >
          {showImage ? (
            <Image
              src={hero as string}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
              onError={() => setImgError(true)}
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="size-20 text-white/25" />
            </div>
          )}
          {discount > 0 && (
            <span className="absolute left-4 top-4 rounded-full bg-kap-yellow px-3 py-1 text-xs font-bold text-kap-purple">
              {discount}% off
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.category && (
            <p className="text-sm font-medium text-kap-yellow/80">
              {product.category}
            </p>
          )}
          <h1 className="display-hero mt-2 text-3xl text-white sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight text-white">
              {formatLKR(product.price, product.currency)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="pb-1 text-lg text-white/35 line-through">
                {formatLKR(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-white/55">
              {product.description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {qty === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-kira-canvas transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Plus className="size-4" /> Add to bag
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-full bg-white/10 px-2 py-2">
                <button
                  type="button"
                  onClick={() => updateQty(product.id, qty - 1)}
                  aria-label="Decrease quantity"
                  className="flex size-9 items-center justify-center rounded-full text-white/85 hover:bg-white/15 active:scale-90"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(product.id, qty + 1)}
                  aria-label="Increase quantity"
                  className="flex size-9 items-center justify-center rounded-full text-white/85 hover:bg-white/15 active:scale-90"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}

            {qty > 0 && (
              <button
                type="button"
                onClick={openCart}
                className="inline-flex items-center gap-1.5 rounded-full bg-kira-leaf/15 px-5 py-3.5 text-sm font-semibold text-kira-leaf transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Check className="size-4" /> View bag
              </button>
            )}

            <button
              type="button"
              onClick={openKira}
              className="inline-flex items-center gap-2 rounded-full glass-card px-5 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Sparkles className="size-4 text-kap-yellow" /> Ask Kira about this
            </button>
          </div>

          {/* Reassurance */}
          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <Truck className="size-5 text-kira-leaf" />
              <div>
                <p className="text-[13px] font-semibold text-white">Islandwide delivery</p>
                <p className="text-[12px] text-white/45">Kira checks dates & fees live</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <ShieldCheck className="size-5 text-kira-leaf" />
              <div>
                <p className="text-[13px] font-semibold text-white">
                  {product.inStock === false ? "Currently unavailable" : "In stock"}
                </p>
                <p className="text-[12px] text-white/45">
                  {product.stockLevel ?? "Ready to order"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
