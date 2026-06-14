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
    const onScroll = () => setScrolled(window.scrollY > 12);
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
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
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

  const topCategories = categories.slice(0, 5);

  return (
    <header
      className={cn(
        "sticky top-0 z-[80] transition-all duration-500 ease-out",
        scrolled ? "liquid-glass-nav" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center gap-3 px-5 sm:h-14 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center transition-opacity duration-300 hover:opacity-90"
        >
          <Image
            src="/kapruka-logo.svg"
            alt="Kapruka"
            width={108}
            height={26}
            className="h-[22px] w-auto object-contain opacity-90 sm:h-6"
            priority
          />
        </Link>

        <nav className="ml-1 hidden items-center gap-0.5 lg:flex">
          {topCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium tracking-tight transition-colors duration-200",
                scrolled
                  ? "text-white/65 hover:bg-white/8 hover:text-white"
                  : "text-white/50 hover:bg-white/6 hover:text-white/80"
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={openKira}
            className="liquid-btn-accent hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold sm:flex"
          >
            <Sparkles className="size-3.5 opacity-90" /> Kira
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="flex size-8 items-center justify-center rounded-full liquid-glass-pill text-white/75 sm:size-9"
          >
            {searchOpen ? <X className="size-3.5" /> : <Search className="size-3.5" />}
          </button>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex size-8 items-center justify-center rounded-full liquid-glass-pill text-white/85 sm:size-9"
          >
            <ShoppingBag className="size-3.5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-0.5 text-[9px] font-bold text-[#0a0712]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="liquid-glass-nav border-t border-white/6">
          <div className="mx-auto w-full max-w-[1200px] px-5 py-3 sm:px-8 sm:py-4">
            <div className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
              <Search className="size-4 shrink-0 text-white/35" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cakes, flowers, gifts…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              {searching && <span className="text-[11px] text-white/30">…</span>}
            </div>

            {results.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-2xl liquid-glass">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between border-b border-white/6 px-4 py-3 last:border-0 transition-colors hover:bg-white/5"
                  >
                    <span className="truncate text-sm text-white/85">{p.name}</span>
                    <span className="ml-3 shrink-0 text-xs font-medium text-white/45">
                      {formatLKR(p.price, p.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {q.trim() && !searching && results.length === 0 && (
              <p className="mt-2 px-1 text-sm text-white/35">
                No matches — try asking Kira.
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
