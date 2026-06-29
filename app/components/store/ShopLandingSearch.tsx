"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlass } from "@/app/components/glass";
import DiscoverGlassBar from "@/app/components/glass/DiscoverGlassBar";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { formatLKR } from "@/app/components/store/storeIcons";
import type { KiraProduct } from "@/types";
import type { StoreCategory } from "@/types/store";

const POPULAR = [
  "Birthday cakes",
  "Flower delivery Colombo",
  "Chocolate hamper",
  "Same-day gifts",
] as const;

type Suggestion = { label: string; hint?: string };

export default function ShopLandingSearch({
  categories,
}: {
  categories: StoreCategory[];
}) {
  const router = useRouter();
  const { open: openKira } = useKiraDock();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KiraProduct[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/store/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.items) ? data.items.slice(0, 6) : []);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const suggestions = useMemo((): Suggestion[] => {
    const q = query.trim().toLowerCase();

    if (q) {
      const productSuggestions = results.map((p) => ({
        label: p.name,
        hint: formatLKR(p.price, p.currency),
      }));
      const staticMatches = [...POPULAR]
        .filter((label) => label.toLowerCase().includes(q))
        .map((label) => ({ label }));

      const seen = new Set<string>();
      return [...productSuggestions, ...staticMatches]
        .filter((s) => {
          const key = s.label.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 8);
    }

    return POPULAR.map((label) => ({ label }));
  }, [categories, query, results]);

  const resolveProduct = (label: string) =>
    results.find((p) => p.name === label);

  const handleSearch = (raw: string) => {
    const term = raw.trim();
    if (!term) return;

    const product = resolveProduct(term);
    if (product) {
      router.push(`/product/${product.id}`);
      setQuery("");
      return;
    }

    const category = categories.find(
      (c) => c.name.toLowerCase() === term.toLowerCase()
    );
    if (category) {
      router.push(`/shop/${category.slug}`);
      setQuery("");
      return;
    }

    openKira({ prompt: term });
    setQuery("");
  };

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className="relative w-full max-w-lg">
      <DiscoverGlassBar
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full"
      />

      {showSuggestions && (
        <LiquidGlass
          radius={20}
          blur={14}
          interactive={false}
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 animate-[fade-up_0.16s_ease]"
          contentClassName="max-h-64 overflow-y-auto p-1.5"
        >
          <ul role="listbox" aria-label="Search suggestions">
            {suggestions.map((s) => (
              <li key={s.label} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSearch(s.label)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.hint && (
                    <span className="shrink-0 text-[12px] text-white/30">
                      {s.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </LiquidGlass>
      )}
    </div>
  );
}
