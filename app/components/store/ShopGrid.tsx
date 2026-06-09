"use client";

import { useCallback, useState } from "react";
import type { KiraProduct } from "@/types";
import type { StoreSort } from "@/types/store";
import StoreProductCard from "./StoreProductCard";
import Reveal from "./Reveal";

const SORT_OPTIONS: { value: StoreSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

const PAGE = 12;

export default function ShopGrid({
  slug,
  initialItems,
  total,
}: {
  slug: string;
  initialItems: KiraProduct[];
  total: number;
}) {
  const [items, setItems] = useState<KiraProduct[]>(initialItems);
  const [sort, setSort] = useState<StoreSort>("featured");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(total);

  const fetchPage = useCallback(
    async (nextSort: StoreSort, offset: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/store/products?category=${encodeURIComponent(slug)}&sort=${nextSort}&limit=${PAGE}&offset=${offset}`
        );
        const data = await res.json();
        const next: KiraProduct[] = Array.isArray(data.items) ? data.items : [];
        setCount(typeof data.total === "number" ? data.total : count);
        setItems((prev) => (offset === 0 ? next : [...prev, ...next]));
      } catch {
        /* keep current items */
      } finally {
        setLoading(false);
      }
    },
    [slug, count]
  );

  function onSort(next: StoreSort) {
    setSort(next);
    void fetchPage(next, 0);
  }

  const canLoadMore = items.length < count;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-white/45">
          {count} item{count === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as StoreSort)}
            className="glass-input rounded-full px-4 py-2 text-[13px] font-medium text-white/85 outline-none [color-scheme:dark]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-kira-paper">
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p, i) => (
          <Reveal key={`${p.id}-${i}`} delay={Math.min((i % 8) * 40, 280)} className="h-full">
            <StoreProductCard product={p} categorySlug={slug} />
          </Reveal>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-white/45">
          Nothing here yet — try asking Kira.
        </p>
      )}

      {canLoadMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchPage(sort, items.length)}
            className="rounded-full glass-card px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
