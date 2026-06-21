"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag, Sparkles, X } from "lucide-react";
import type { KiraProduct } from "@/types";
import type { StoreCategory } from "@/types/store";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { formatLKR } from "./storeIcons";
import { cn } from "@/lib/utils";

export default function StoreNav({ categories }: { categories: StoreCategory[] }) {
  const { cartCount, openCart } = useCart();
  const { open: openKira } = useKiraDock();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KiraProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      const t = setTimeout(() => {
        setResults([]);
        setSearching(false);
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/store/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.items) ? data.items.slice(0, 6) : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

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

        {/* Categories */}
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

        <div className="ml-auto flex items-center gap-2">
          {/* Ask Kira */}
          <button
            type="button"
            onClick={() => openKira()}
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(64,41,112,0.5)] transition-transform hover:scale-[1.03] active:scale-95 sm:flex"
          >
            <Sparkles className="size-3.5" /> Ask Kira
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="flex size-9 items-center justify-center rounded-full glass-chip text-white/80"
          >
            {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
          </button>

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex size-9 items-center justify-center rounded-full glass-chip text-white/90"
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

      {/* Search panel */}
      {searchOpen && (
        <div className="liquid-glass-nav border-t border-white/8">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-4 sm:px-8">
            <div className="glass-input flex items-center gap-3 rounded-xl px-4 py-3">
              <Search className="size-4 shrink-0 text-white/40" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cakes, flowers, gifts…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              {searching && <span className="text-[11px] text-white/40">…</span>}
            </div>

            {results.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/6"
                  >
                    <span className="truncate text-sm text-white/85">{p.name}</span>
                    <span className="ml-3 shrink-0 text-xs font-semibold text-white/55">
                      {formatLKR(p.price, p.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {q.trim() && !searching && results.length === 0 && (
              <p className="mt-3 px-1 text-sm text-white/40">
                No matches — try asking Kira instead.
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
