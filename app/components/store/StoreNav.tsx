"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Sparkles, X } from "lucide-react";
import type { KiraProduct } from "@/types";
import type { StoreCategory } from "@/types/store";
import { useCart } from "@/app/context/CartContext";
import { useKiraDock } from "@/app/context/KiraDockContext";
import KaprukaLogo from "@/app/components/store/KaprukaLogo";
import { Button } from "@/components/ui/button";
import { formatLKR } from "./storeIcons";
import { cn } from "@/lib/utils";

const navLink =
  "min-h-11 rounded-full px-3 py-2 text-[15px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

export default function StoreNav({ categories }: { categories: StoreCategory[] }) {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  const { open: openKira } = useKiraDock();

  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KiraProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const topCategories = categories.slice(0, 4);

  function isActive(href: string) {
    if (href === "/shop") return pathname === "/shop";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <header className="store-nav-purple sticky top-0 z-[80]">
      <div className="mx-auto flex h-[52px] w-full max-w-[1280px] items-center gap-3 px-5 sm:h-14 sm:gap-4 sm:px-8">
        <Link
          href="/shop"
          aria-label="Kapruka home"
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <KaprukaLogo />
        </Link>

        <nav
          className="ml-1 hidden min-w-0 flex-1 items-center gap-0.5 lg:flex"
          aria-label="Store"
        >
          <Link
            href="/shop"
            aria-current={isActive("/shop") ? "page" : undefined}
            className={cn(
              navLink,
              isActive("/shop") && "bg-white/15"
            )}
          >
            Gifts
          </Link>
          <Link
            href="/track"
            aria-current={isActive("/track") ? "page" : undefined}
            className={cn(
              navLink,
              isActive("/track") && "bg-white/15"
            )}
          >
            Track
          </Link>
          {topCategories.map((c) => {
            const href = `/shop/${c.slug}`;
            const active = isActive(href);
            return (
              <Link
                key={c.slug}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLink,
                  "max-w-[9.5rem] truncate",
                  active && "bg-white/15"
                )}
                title={c.name}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            className="h-10 rounded-full bg-kap-yellow px-3.5 text-[14px] font-bold text-gray-950 shadow-none hover:brightness-95 sm:h-11 sm:px-5 sm:text-[15px]"
            onClick={() => openKira()}
          >
            <Sparkles className="size-3.5 text-kap-purple sm:hidden" aria-hidden />
            <span className="sm:hidden">Kira</span>
            <span className="hidden sm:inline">Ask Kira</span>
          </Button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            className="flex size-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:size-11"
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex size-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:size-11"
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
        <div className="border-t border-white/10 bg-white">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-4 sm:px-8">
            <div className="glass-input flex items-center gap-3 rounded-xl px-4 py-3">
              <Search className="size-4 shrink-0 text-kira-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search cakes, flowers, gifts…"
                className="w-full bg-transparent text-[17px] text-kira-text outline-none placeholder:text-kira-muted focus-visible:ring-0"
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
                    className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.04]"
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
