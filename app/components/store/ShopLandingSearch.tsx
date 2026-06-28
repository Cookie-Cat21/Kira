"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassSearch } from "@/app/components/glass";
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

export default function ShopLandingSearch({
  categories,
}: {
  categories: StoreCategory[];
}) {
  const router = useRouter();
  const { open: openKira } = useKiraDock();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KiraProduct[]>([]);

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
        setResults(Array.isArray(data.items) ? data.items.slice(0, 5) : []);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const categoryLabels = categories.slice(0, 6).map((c) => c.name);
    const productSuggestions = results.map((p) => ({
      label: p.name,
      hint: formatLKR(p.price, p.currency),
    }));

    if (!q) {
      return [
        ...POPULAR.map((label) => ({ label })),
        ...categoryLabels.map((label) => ({ label, hint: "Category" })),
      ];
    }

    const staticMatches = [...POPULAR, ...categoryLabels]
      .filter((label) => label.toLowerCase().includes(q))
      .map((label) => ({ label }));

    const seen = new Set<string>();
    const merged = [...productSuggestions, ...staticMatches].filter((s) => {
      const key = s.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return merged.slice(0, 8);
  }, [categories, query, results]);

  const resolveProduct = (label: string) =>
    results.find((p) => p.name === label);

  const handleSearch = (raw: string) => {
    const term = raw.trim();
    if (!term) return;

    const product = resolveProduct(term);
    if (product) {
      router.push(`/product/${product.id}`);
      return;
    }

    const category = categories.find(
      (c) => c.name.toLowerCase() === term.toLowerCase()
    );
    if (category) {
      router.push(`/shop/${category.slug}`);
      return;
    }

    openKira({ prompt: `I'm looking for ${term} on Kapruka` });
  };

  return (
    <GlassSearch
      value={query}
      onChange={setQuery}
      onSearch={handleSearch}
      placeholder="Search cakes, flowers, gifts…"
      suggestions={suggestions}
      className="w-full max-w-md"
      radius={999}
    />
  );
}
