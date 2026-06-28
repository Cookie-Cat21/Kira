import { cache } from "react";
import { notFound } from "next/navigation";
import StoreChrome from "@/app/components/store/StoreChrome";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import ShopGrid from "@/app/components/store/ShopGrid";
import CategoryFilterPills from "@/app/components/store/CategoryFilterPills";
import MarqueeTicker from "@/app/components/store/MarqueeTicker";
import { getCategories, getProductsByCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const getCategoriesCached = cache(getCategories);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getCategoriesCached();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Shop — Kapruka, reimagined" };
  return {
    title: `${category.name} — Kapruka`,
    description:
      category.blurb ??
      `Shop ${category.name} on Kapruka — delivered islandwide. Or just ask Kira.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, first] = await Promise.all([
    getCategoriesCached().catch(() => getCategories()),
    getProductsByCategory(slug, { limit: 12, sort: "featured" }),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <div className="min-h-dvh">
      <StoreChrome />
      <StoreNav categories={categories} />
      <MarqueeTicker />
      <main className="mx-auto w-full max-w-[1280px] px-5 pb-12 pt-10 sm:px-8">
        <div className="spotlight pointer-events-none absolute inset-x-0 top-14 h-64" />
        <header className="relative mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
            Shop all / {category.name}
          </p>
          <h1 className="font-display mt-3 text-4xl uppercase tracking-tight text-white sm:text-5xl">
            Shop {category.name}
          </h1>
          {category.blurb && (
            <p className="mt-3 max-w-lg text-[15px] text-white/50">{category.blurb}</p>
          )}
        </header>

        <div className="relative mb-8">
          <CategoryFilterPills activeSlug={slug} />
        </div>

        <ShopGrid slug={slug} initialItems={first.items} total={first.total} />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
