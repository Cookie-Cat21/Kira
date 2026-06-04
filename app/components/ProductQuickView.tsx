"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Package,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import type { CartItem, KiraProduct, KiraProductDetails } from "@/types";
import { cn } from "@/lib/utils";

interface ProductQuickViewProps {
  product: KiraProduct;
  cart: CartItem[];
  onAddToCart: (product: KiraProduct) => void;
  onClose: () => void;
}

type LoadState = "loading" | "ready" | "error";

export default function ProductQuickView({
  product,
  cart,
  onAddToCart,
  onClose,
}: ProductQuickViewProps) {
  const [details, setDetails] = useState<KiraProductDetails | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch(
      `/api/products/${encodeURIComponent(product.id)}?currency=${encodeURIComponent(
        product.currency ?? "LKR"
      )}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          product?: KiraProductDetails;
          error?: string;
        };
        if (!res.ok || !body.product) {
          throw new Error(body.error ?? "Product details unavailable");
        }
        setDetails(body.product);
        setState("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Product details unavailable");
        setState("error");
      });

    return () => controller.abort();
  }, [product.currency, product.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const display: KiraProductDetails = details ?? {
    ...product,
    images: product.image ? [product.image] : [],
    variants: [],
  };
  const images = useMemo(
    () => (display.images.length ? display.images : product.image ? [product.image] : []),
    [display.images, product.image]
  );
  const selectedImage = images[Math.min(activeImage, Math.max(images.length - 1, 0))];
  const inCart = cart.some((item) => item.product.id === product.id);
  const qty = cart.find((item) => item.product.id === product.id)?.quantity ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 px-3 py-4 sm:px-6 sm:py-8 flex items-end sm:items-center justify-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} details`}
        className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-kira-border shadow-2xl animate-fade-up flex flex-col"
      >
        <header className="shrink-0 h-12 px-4 border-b border-kira-border flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-kira-muted">
              Product details
            </p>
            <p className="text-xs text-kira-text truncate">{product.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="h-8 w-8 rounded-full border border-kira-border text-kira-muted flex items-center justify-center hover:text-kira-text hover:border-kap-purple transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto">
          <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-kira-bg border border-kira-border">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={display.name}
                    fill
                    sizes="(max-width: 640px) 92vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-4xl text-kira-muted">
                    🛍️
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.slice(0, 6).map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setActiveImage(index)}
                      aria-label={`Show image ${index + 1}`}
                      className={cn(
                        "relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border transition-colors",
                        index === activeImage
                          ? "border-kap-purple"
                          : "border-kira-border"
                      )}
                    >
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 flex flex-col gap-3">
              <div>
                {display.category && (
                  <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-kap-purple bg-kap-purple/10 rounded-full px-2 py-1 mb-2">
                    {display.category}
                  </span>
                )}
                <h2 className="text-xl font-display leading-tight text-kira-text">
                  {display.name}
                </h2>
                {display.summary && (
                  <p className="text-sm text-kira-text-2 leading-relaxed mt-2">
                    {display.summary}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-bold text-kap-purple">
                  {formatCurrency(display.price, display.currency)}
                </p>
                {details?.compareAtPrice && details.compareAtPrice > display.price && (
                  <p className="text-sm text-kira-muted line-through">
                    {formatCurrency(details.compareAtPrice, display.currency)}
                  </p>
                )}
                {display.inStock !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-1",
                      display.inStock
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {display.inStock ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {display.inStock ? "In stock" : "Out of stock"}
                  </span>
                )}
              </div>

              {state === "loading" && <QuickViewSkeleton />}
              {state === "error" && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  {error}
                </div>
              )}

              {state === "ready" && details && (
                <>
                  {details.description && (
                    <p className="text-sm leading-relaxed text-kira-text-2 max-h-28 overflow-y-auto pr-1">
                      {details.description}
                    </p>
                  )}

                  {details.variants.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-kira-muted mb-2">
                        Variants
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {details.variants.slice(0, 5).map((variant) => (
                          <span
                            key={variant.id}
                            className="rounded-full border border-kira-border px-2.5 py-1 text-xs text-kira-text bg-kira-bg"
                          >
                            {variant.name}
                            {variant.price > 0 &&
                              ` · ${formatCurrency(
                                variant.price,
                                variant.currency ?? display.currency
                              )}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.shipping && (
                    <div className="grid grid-cols-2 gap-2">
                      {details.shipping.shipsFrom && (
                        <InfoPill
                          icon={Package}
                          label="Ships from"
                          value={details.shipping.shipsFrom}
                        />
                      )}
                      {details.shipping.shipsInternationally !== undefined && (
                        <InfoPill
                          icon={Truck}
                          label="Delivery"
                          value={
                            details.shipping.shipsInternationally
                              ? "SL + international"
                              : "Sri Lanka only"
                          }
                        />
                      )}
                    </div>
                  )}

                  {details.attributes && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {Object.entries(details.attributes)
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <dt className="text-kira-muted capitalize">
                              {key.replace(/_/g, " ")}
                            </dt>
                            <dd className="text-kira-text font-medium truncate">
                              {value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  )}
                </>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                    inCart
                      ? "bg-kap-purple/10 text-kap-purple border border-kap-purple/20"
                      : "bg-kap-yellow text-gray-900 hover:brightness-95 shadow-sm"
                  )}
                >
                  {inCart ? (
                    <>
                      <Check className="h-4 w-4" />
                      In cart ({qty})
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Add to cart
                    </>
                  )}
                </button>
                {display.url && (
                  <a
                    href={display.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open product on Kapruka"
                    className="h-11 w-11 rounded-xl border border-kira-border text-kira-muted flex items-center justify-center hover:text-kap-purple hover:border-kap-purple transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickViewSkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-label="Loading product details">
      <div className="h-3 rounded-full bg-kira-border w-full" />
      <div className="h-3 rounded-full bg-kira-border w-10/12" />
      <div className="h-9 rounded-xl bg-kira-border/80 w-full mt-3" />
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-kira-border bg-kira-bg px-3 py-2 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-kira-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-xs font-semibold text-kira-text mt-1 truncate">{value}</p>
    </div>
  );
}

function formatCurrency(amount: number, currency = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
