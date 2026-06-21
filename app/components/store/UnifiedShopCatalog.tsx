"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { KiraProduct } from "@/types";
import type { StoreCategory } from "@/types/store";
import { categoryIcon, phClass } from "./storeIcons";
import ShopGrid from "./ShopGrid";
import Reveal from "./Reveal";
import { cn } from "@/lib/utils";

export default function UnifiedShopCatalog({
  categories,
  initialCategory,
  initialItems,
  total,
}: {
  categories: StoreCategory[];
  initialCategory: string | null;
  initialItems: KiraProduct[];
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const activeSlug = searchParams.get("category") ?? initialCategory ?? null;
  const activeCategory = activeSlug
    ? categories.find((c) => c.slug === activeSlug)
    : null;

  const setCategory = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) params.set("category", slug);
      else params.delete("category");
      const qs = params.toString();
      router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (searchParams.get("category") && tabsRef.current) {
      const btn = tabsRef.current.querySelector<HTMLButtonElement>(
        `[data-slug="${searchParams.get("category")}"]`
      );
      btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [searchParams]);

  return (
    <section id="catalog" className="scroll-mt-24 border-t border-kira-border bg-white">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-8 sm:py-16">
        <Reveal className="mb-8 max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-kap-purple">
            Full catalog
          </p>
          <h2 className="display-hero mt-2 text-3xl text-kira-text sm:text-4xl">
            {activeCategory ? activeCategory.name : "Everything Kapruka"}
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-kira-text-2">
            {activeCategory?.blurb ??
              "Cakes, flowers, hampers, chocolates and more — one place, delivered islandwide."}
          </p>
        </Reveal>

        <div
          ref={tabsRef}
          className="scrollbar-hide -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
          aria-label="Browse by category"
        >
          <CategoryTab
            active={!activeSlug}
            onClick={() => setCategory(null)}
            label="All"
            count={categories.reduce((n, c) => n + (c.productCount || 0), 0)}
          />
          {categories.map((c) => {
            const Icon = categoryIcon(c.icon);
            return (
              <CategoryTab
                key={c.slug}
                slug={c.slug}
                active={activeSlug === c.slug}
                onClick={() => setCategory(c.slug)}
                label={c.name}
                count={c.productCount}
                icon={<Icon className="size-3.5" />}
                tint={phClass(c.slug)}
              />
            );
          })}
        </div>

        <ShopGrid
          key={activeSlug ?? "all"}
          categorySlug={activeSlug}
          initialItems={initialItems}
          total={total}
        />
      </div>
    </section>
  );
}

function CategoryTab({
  slug,
  active,
  onClick,
  label,
  count,
  icon,
  tint,
}: {
  slug?: string;
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  tint?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-slug={slug}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors",
        active
          ? "border-kap-purple bg-kap-purple text-white shadow-sm"
          : "border-kira-border bg-[#f5f5f7] text-kira-text hover:border-kap-purple/30 hover:bg-white"
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            active ? "bg-white/20 text-white" : cn("text-white/90", tint)
          )}
        >
          {icon}
        </span>
      )}
      <span className="whitespace-nowrap">{label}</span>
      {count != null && count > 0 && (
        <span
          className={cn(
            "text-[12px] tabular-nums",
            active ? "text-white/75" : "text-kira-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
