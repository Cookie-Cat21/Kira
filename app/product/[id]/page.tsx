import { notFound } from "next/navigation";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import ProductDetailClient from "@/app/components/store/ProductDetailClient";
import { getCategories, getProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, product] = await Promise.all([
    getCategories(),
    getProduct(id),
  ]);

  if (!product) notFound();

  return (
    <div className="min-h-dvh">
      <StoreNav categories={categories} />
      <main className="relative">
        <ProductDetailClient product={product} />
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
