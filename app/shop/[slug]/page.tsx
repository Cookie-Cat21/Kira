import { cache } from "react";
import { notFound } from "next/navigation";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import TrustBar from "@/app/components/store/TrustBar";
import ShopGrid from "@/app/components/store/ShopGrid";
import CategoryKiraBanner from "@/app/components/store/CategoryKiraBanner";
import { getCategories, getProductsByCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Deduped per request — generateMetadata and the page share one DB call.
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
    getCategoriesCached(),
    getProductsByCategory(slug, { limit: 12, sort: "featured" }),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <div className="min-h-dvh bg-[#f5f5f7] text-kira-text">
      <StoreNav categories={categories} />
      <TrustBar />
      <main className="mx-auto w-full max-w-[1280px] px-5 pb-12 pt-12 sm:px-8">
        <div className="spotlight pointer-events-none absolute inset-x-0 top-14 h-64" />
        <header className="relative mb-10">
          <p className="text-[15px] font-medium text-kira-text-2">Kapruka</p>
          <h1 className="display-hero mt-2 text-4xl text-kira-text sm:text-5xl">
            {category.name}
          </h1>
          {category.blurb && (
            <p className="mt-3 max-w-lg text-[17px] text-kira-text-2">{category.blurb}</p>
          )}
        </header>

        <CategoryKiraBanner categoryName={category.name} slug={slug} />

        <ShopGrid slug={slug} initialItems={first.items} total={first.total} />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
