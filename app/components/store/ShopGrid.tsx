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
  categorySlug,
  initialItems,
  total,
}: {
  categorySlug?: string | null;
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
        const params = new URLSearchParams({
          sort: nextSort,
          limit: String(PAGE),
          offset: String(offset),
        });
        if (categorySlug) params.set("category", categorySlug);
        const res = await fetch(`/api/store/products?${params}`);
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
    [categorySlug, count]
  );

  function onSort(next: StoreSort) {
    setSort(next);
    void fetchPage(next, 0);
  }

  const canLoadMore = items.length < count;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[15px] text-kira-text-2">
          {count} item{count === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as StoreSort)}
            className="rounded-full border border-kira-border bg-white px-4 py-2 text-[13px] font-medium text-kira-text outline-none focus-visible:ring-2 focus-visible:ring-kap-purple/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p, i) => (
          <Reveal key={`${p.id}-${i}`} delay={Math.min((i % 8) * 40, 280)} className="h-full">
            <StoreProductCard product={p} categorySlug={categorySlug ?? undefined} />
          </Reveal>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-[15px] text-kira-text-2">
          Nothing here yet — try asking Kira.
        </p>
      )}

      {canLoadMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchPage(sort, items.length)}
            className="rounded-full border border-kira-border bg-white px-6 py-3 text-sm font-semibold text-kira-text shadow-sm transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
