"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag, X } from "lucide-react";
import type { KiraProduct } from "@/types";
import type { StoreCategory } from "@/types/store";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { Button } from "@/components/ui/button";
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
        scrolled ? "store-nav" : "bg-[#f5f5f7]/80"
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-4 px-5 sm:px-8">
        <Link href="/shop" className="flex shrink-0 items-center">
          <Image
            src="/kapruka-logo.svg"
            alt="Kapruka"
            width={120}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          <Link
            href="/shop"
            className="min-h-11 rounded-full px-3 py-2 text-[15px] font-medium text-kira-text-2 transition-colors hover:bg-black/5 hover:text-kira-text"
          >
            Gifts
          </Link>
          <Link
            href="/track"
            className="min-h-11 rounded-full px-3 py-2 text-[15px] font-medium text-kira-text-2 transition-colors hover:bg-black/5 hover:text-kira-text"
          >
            Track
          </Link>
          {topCategories.slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="min-h-11 rounded-full px-3 py-2 text-[15px] font-medium text-kira-text-2 transition-colors hover:bg-black/5 hover:text-kira-text"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            className="hidden h-11 rounded-full bg-kap-purple px-5 text-[15px] font-semibold hover:bg-kap-purple/90 sm:inline-flex"
            onClick={() => openKira()}
          >
            Ask Kira
          </Button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-full border border-kira-border bg-white text-kira-text-2 transition-colors hover:bg-[#f5f5f7]"
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex size-11 items-center justify-center rounded-full border border-kira-border bg-white text-kira-text transition-colors hover:bg-[#f5f5f7]"
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-kap-yellow px-1 text-[10px] font-bold text-kap-purple">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="store-nav border-t border-kira-border">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-4 sm:px-8">
            <div className="glass-input flex items-center gap-3 rounded-xl px-4 py-3">
              <Search className="size-4 shrink-0 text-kira-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cakes, flowers, gifts…"
                className="w-full bg-transparent text-[17px] text-kira-text outline-none placeholder:text-kira-muted"
              />
              {searching && <span className="text-[13px] text-kira-muted">…</span>}
            </div>

            {results.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-black/5"
                  >
                    <span className="truncate text-[15px] text-kira-text">{p.name}</span>
                    <span className="ml-3 shrink-0 text-[13px] font-semibold text-kira-text-2">
                      {formatLKR(p.price, p.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {q.trim() && !searching && results.length === 0 && (
              <p className="mt-3 px-1 text-[15px] text-kira-text-2">
                No matches.{" "}
                <button
                  type="button"
                  className="font-semibold text-kap-purple underline-offset-2 hover:underline"
                  onClick={() => {
                    setSearchOpen(false);
                    openKira({ prompt: `Find "${q.trim()}" on Kapruka` });
                  }}
                >
                  Ask Kira instead
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
