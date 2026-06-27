import { cache } from "react";
import { notFound } from "next/navigation";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import ProductDetailClient from "@/app/components/store/ProductDetailClient";
import { getCategories, getProduct, getRelatedProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Deduped per request — generateMetadata and the page share one DB call.
const getProductCached = cache(getProduct);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductCached(id);
  if (!product) return { title: "Kapruka" };
  return {
    title: `${product.name} — Kapruka`,
    description:
      product.summary ??
      `${product.name} on Kapruka — delivered islandwide. Or just ask Kira.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, product] = await Promise.all([
    getCategories(),
    getProductCached(id),
  ]);

  if (!product) notFound();
  const relatedProducts = await getRelatedProducts(product, 8);

  return (
    <div className="min-h-dvh">
      <StoreNav categories={categories} />
      <main className="relative">
        <ProductDetailClient product={product} relatedProducts={relatedProducts} />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
