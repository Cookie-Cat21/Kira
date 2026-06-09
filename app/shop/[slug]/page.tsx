import { notFound } from "next/navigation";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import ShopGrid from "@/app/components/store/ShopGrid";
import { getCategories, getProductsByCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, first] = await Promise.all([
    getCategories(),
    getProductsByCategory(slug, { limit: 12, sort: "featured" }),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <div className="min-h-dvh">
      <StoreNav categories={categories} />
      <main className="mx-auto w-full max-w-[1280px] px-5 pb-12 pt-12 sm:px-8">
        <div className="spotlight pointer-events-none absolute inset-x-0 top-14 h-64" />
        <header className="relative mb-10">
          <p className="text-sm font-medium text-kap-yellow/80">Kapruka</p>
          <h1 className="display-hero mt-2 text-4xl text-white sm:text-5xl">
            {category.name}
          </h1>
          {category.blurb && (
            <p className="mt-3 max-w-lg text-[15px] text-white/50">{category.blurb}</p>
          )}
        </header>

        <ShopGrid slug={slug} initialItems={first.items} total={first.total} />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
