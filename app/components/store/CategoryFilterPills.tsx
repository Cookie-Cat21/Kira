"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const FILTERS = [
  { slug: "", label: "All" },
  { slug: "cakes", label: "Cakes" },
  { slug: "flowers", label: "Flowers" },
  { slug: "hampers", label: "Hampers" },
  { slug: "chocolates", label: "Chocolates" },
  { slug: "plants", label: "Plants" },
  { slug: "candles", label: "Candles" },
] as const;

export default function CategoryFilterPills({
  activeSlug = "",
}: {
  activeSlug?: string;
}) {
  return (
    <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
      {FILTERS.map(({ slug, label }) => {
        const active = slug === activeSlug;
        const href = slug ? `/shop/${slug}` : "/shop";
        return (
          <Link
            key={slug || "all"}
            href={href}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "border-white bg-white text-black"
                : "border-white/20 text-white/60 hover:border-white/35 hover:text-white/80"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
