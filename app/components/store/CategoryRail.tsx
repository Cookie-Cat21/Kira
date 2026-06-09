import Link from "next/link";
import type { StoreCategory } from "@/types/store";
import { categoryIcon, phClass } from "./storeIcons";
import Reveal from "./Reveal";

export default function CategoryRail({
  categories,
}: {
  categories: StoreCategory[];
}) {
  if (!categories.length) return null;
  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <Reveal>
        <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => {
            const Icon = categoryIcon(c.icon);
            return (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className="group flex w-[150px] shrink-0 flex-col gap-3 rounded-2xl glass-card p-4 transition-transform hover:-translate-y-1"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ph-tile ${phClass(
                    c.slug
                  )}`}
                >
                  <Icon className="size-5 text-white/90" />
                </span>
                <span className="text-sm font-medium text-white/90">
                  {c.name}
                </span>
                <span className="text-[11px] text-white/40">
                  {c.productCount > 0 ? `${c.productCount} items` : "Browse"}
                </span>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
