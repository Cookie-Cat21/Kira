"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { KiraOrb } from "@/app/components/KiraOrb";
import type { StoreCategory } from "@/types/store";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { cn } from "@/lib/utils";

export default function StoreNav({
  categories,
  minimal = false,
}: {
  categories: StoreCategory[];
  minimal?: boolean;
}) {
  const { cartCount, openCart } = useCart();
  const { open: openKira } = useKiraDock();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const topCategories = categories.slice(0, 6);

  return (
    <header
      className={cn(
        "sticky top-0 z-[80] transition-all duration-300",
        scrolled ? "liquid-glass-nav" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-5 sm:px-8">
        {/* Brand */}
        <Link
          href="/shop"
          className={cn(
            "flex shrink-0 items-center gap-2 transition-opacity duration-300",
            scrolled ? "opacity-100" : "opacity-85"
          )}
        >
          <Image
            src="/kapruka-logo.svg"
            alt="Kapruka"
            width={120}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>

        {/* Categories — hidden on minimal landing for deference to hero */}
        {!minimal && (
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-300 hover:bg-white/8 hover:text-white",
                  scrolled ? "text-white/70" : "text-white/45"
                )}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!minimal && (
            <button
              type="button"
              onClick={() => openKira()}
              className="hidden min-h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(64,41,112,0.5)] transition-transform hover:scale-[1.03] active:scale-95 sm:flex"
            >
              <KiraOrb size={22} /> Ask Kira
            </button>
          )}

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex size-11 items-center justify-center rounded-full glass-chip text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ShoppingBag className="size-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-kap-yellow px-1 text-[10px] font-bold text-kap-purple">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
