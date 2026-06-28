import Image from "next/image";
import Link from "next/link";
import type { StoreCategory } from "@/types/store";
import Reveal from "./Reveal";

const CATEGORY_IMAGES: Record<string, string> = {
  cakes:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  flowers:
    "https://images.unsplash.com/photo-1490750967868-88df5691cc8b?w=600&q=80",
  hampers:
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80",
  chocolates:
    "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=80",
  plants:
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
  candles:
    "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80",
  electronics:
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&q=80",
  grocery:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
  kids:
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80",
  home:
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&q=80";

export default function CategoryRail({
  categories,
}: {
  categories: StoreCategory[];
}) {
  if (!categories.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const image = CATEGORY_IMAGES[c.slug] ?? FALLBACK_IMAGE;
            return (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 sm:aspect-[16/10] lg:aspect-[4/5]"
              >
                <Image
                  src={image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-colors group-hover:from-black/80" />
                <div className="absolute bottom-0 left-0 p-5 sm:p-6">
                  <h3 className="text-2xl font-semibold text-white">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/65">
                    {c.productCount > 0
                      ? `${c.productCount} items`
                      : "Browse collection"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
