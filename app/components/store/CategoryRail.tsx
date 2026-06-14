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
    <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      <Reveal>
        <div className="scrollbar-hide -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => {
            const Icon = categoryIcon(c.icon);
            return (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className="group flex w-[132px] shrink-0 flex-col items-center gap-2.5 rounded-[20px] liquid-glass-card p-4 text-center"
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl ph-tile ${phClass(
                    c.slug
                  )}`}
                >
                  <Icon className="size-5 text-white/85" />
                </span>
                <span className="text-[13px] font-medium tracking-tight text-white/85">
                  {c.name}
                </span>
                <span className="text-[10px] text-white/35">
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
