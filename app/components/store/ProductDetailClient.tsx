"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Gift, Minus, Plus, Sparkles, Truck, ShieldCheck } from "lucide-react";
import type { KiraProduct, KiraProductDetails } from "@/types";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { categoryIcon, formatLKR, phClass } from "./storeIcons";
import StoreProductCard from "./StoreProductCard";
import { cn } from "@/lib/utils";

const PlaceholderIcon = categoryIcon();

export default function ProductDetailClient({
  product,
  relatedProducts = [],
}: {
  product: KiraProductDetails;
  relatedProducts?: KiraProduct[];
}) {
  const { cart, addToCart, updateQty, triggerFly, openCart } = useCart();
  const { open: openKira } = useKiraDock();
  const [imgError, setImgError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null
  );
  const imgRef = useRef<HTMLDivElement | null>(null);

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const activeProduct: KiraProduct = selectedVariant
    ? {
        id: selectedVariant.id,
        name: `${product.name} (${selectedVariant.name})`,
        price: selectedVariant.price || product.price,
        currency: selectedVariant.currency ?? product.currency,
        image: product.image,
        summary: product.summary,
        category: product.category,
        url: product.url,
        inStock: selectedVariant.inStock ?? product.inStock,
        stockLevel: selectedVariant.stockLevel ?? product.stockLevel,
      }
    : product;

  const inCart = cart.find((i) => i.product.id === activeProduct.id);
  const qty = inCart?.quantity ?? 0;
  const hero = product.images?.[0] ?? product.image;
  const showImage = Boolean(hero) && !imgError;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  function handleAdd() {
    addToCart(activeProduct);
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
          {(product.variants.length > 0 || (product.addons?.length ?? 0) > 0) && (
            <div className="mt-7 space-y-4 rounded-3xl border border-white/8 bg-white/[0.035] p-5">
              {product.variants.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Choose size
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.variants.slice(0, 6).map((variant) => (
                      <button
                        type="button"
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all active:scale-95",
                          selectedVariantId === variant.id
                            ? "border-kap-yellow bg-kap-yellow text-kap-purple"
                            : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
                        )}
                      >
                        {variant.name}
                        {variant.price > 0 &&
                          ` · ${formatLKR(variant.price, variant.currency ?? product.currency)}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.addons && product.addons.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Add-ons
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {product.addons.slice(0, 4).map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5"
                      >
                        <span className="text-[13px] font-medium text-white/78">
                          {addon.name}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold text-kap-yellow">
                          {formatLKR(addon.price, addon.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-white/42">
                    Want icing text, candles, or a gift note? Ask Kira — she’ll
                    carry it into the checkout note.
                  </p>
                </div>
              )}
            </div>
          )}

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
                  onClick={() => updateQty(activeProduct.id, qty - 1)}
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
                  onClick={() => updateQty(activeProduct.id, qty + 1)}
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
              onClick={handleAskKira}
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
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:col-span-2">
              <CreditCard className="size-5 text-kap-yellow" />
              <div>
                <p className="text-[13px] font-semibold text-white">Secure Kapruka payment</p>
                <p className="text-[12px] text-white/45">
                  Card and online payment happen on the official Kapruka checkout link.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-kap-yellow/80">
                You might also want these
              </p>
              <h2 className="display-hero mt-1 text-3xl text-white">
                Pair it before checkout.
              </h2>
              <p className="mt-2 max-w-xl text-[14px] text-white/45">
                Kapruka-style cross-sells — chocolates with flowers, flowers with cakes,
                little extras that make the gift feel finished.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openKira({
                  prompt: `Find a good add-on or cross-sell to pair with "${product.name}"`,
                  product: activeProduct,
                })
              }
              className="inline-flex w-fit items-center gap-2 rounded-full glass-card px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Gift className="size-4 text-kap-yellow" /> Ask Kira to pair it
            </button>
          </div>
          <div className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="w-[44vw] max-w-[230px] shrink-0 snap-start sm:w-[230px]"
              >
                <StoreProductCard product={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
