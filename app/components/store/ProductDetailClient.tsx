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

const PlaceholderIcon = categoryIcon();

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

  function handleAskKira() {
    openKira({
      prompt: `Tell me about "${product.name}" — is it a good pick?`,
      // Slim down to the KiraProduct shape — the detail object drags along
      // images/variants/addons that don't belong in the chat session store.
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: hero,
        summary: product.summary,
        category: product.category,
        url: product.url,
        inStock: product.inStock,
        stockLevel: product.stockLevel,
      },
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-8">
      <Link
        href="/shop"
        className="mb-8 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-kira-text-2 transition-colors hover:text-kap-purple"
      >
        <ArrowLeft className="size-4" /> Continue shopping
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Image */}
        <div
          ref={imgRef}
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-3xl border border-kira-border bg-white",
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
              <PlaceholderIcon className="size-20 text-white/25" />
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
            <p className="text-sm font-medium text-kap-purple">
              {product.category}
            </p>
          )}
          <h1 className="display-hero mt-2 text-3xl text-kira-text sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight text-kira-text">
              {formatLKR(product.price, product.currency)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="pb-1 text-lg text-kira-muted line-through">
                {formatLKR(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-kira-text-2">
              {product.description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {qty === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kap-purple px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:bg-kap-purple/90 active:scale-95"
              >
                <Plus className="size-4" /> Add to bag
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-full border border-kira-border bg-kira-bg px-2 py-2">
                <button
                  type="button"
                  onClick={() => updateQty(product.id, qty - 1)}
                  aria-label="Decrease quantity"
                  className="flex size-11 items-center justify-center rounded-full text-kira-text hover:bg-white active:scale-90"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold text-kira-text">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(product.id, qty + 1)}
                  aria-label="Increase quantity"
                  className="flex size-11 items-center justify-center rounded-full text-kira-text hover:bg-white active:scale-90"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}

            {qty > 0 && (
              <button
                type="button"
                onClick={openCart}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 transition-transform hover:bg-emerald-100 active:scale-95"
              >
                <Check className="size-4" /> View bag
              </button>
            )}

            <button
              type="button"
              onClick={handleAskKira}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-kap-purple px-5 py-3.5 text-sm font-semibold text-kap-purple transition-colors hover:bg-kap-purple/5 active:scale-95"
            >
              <Sparkles className="size-4" /> Ask Kira about this
            </button>
          </div>

          {/* Reassurance */}
          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-kira-border bg-white p-4">
              <Truck className="size-5 text-emerald-700" />
              <div>
                <p className="text-[13px] font-semibold text-kira-text">Islandwide delivery</p>
                <p className="text-[12px] text-kira-text-2">Kira checks dates & fees live</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-kira-border bg-white p-4">
              <ShieldCheck className="size-5 text-emerald-700" />
              <div>
                <p className="text-[13px] font-semibold text-kira-text">
                  {product.inStock === false ? "Currently unavailable" : "In stock"}
                </p>
                <p className="text-[12px] text-kira-text-2">
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
