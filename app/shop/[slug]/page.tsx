import { notFound } from "next/navigation";
import StoreAmbient from "@/app/components/store/StoreAmbient";
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
    <>
      <StoreAmbient />
      <div className="relative min-h-dvh">
        <StoreNav categories={categories} />
        <main className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
          <header className="relative mb-10">
            <p className="liquid-eyebrow">Kapruka</p>
            <h1 className="display-serif mt-2 text-4xl font-normal text-white sm:text-5xl">
              {category.name}
            </h1>
            {category.blurb && (
              <p className="mt-3 max-w-md text-[15px] text-white/42">{category.blurb}</p>
            )}
          </header>

          <ShopGrid slug={slug} initialItems={first.items} total={first.total} />
        </main>
        <StoreFooter categories={categories} />
      </div>
    </>
  );
}
