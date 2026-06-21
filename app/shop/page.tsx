import { Suspense } from "react";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import TrustBar from "@/app/components/store/TrustBar";
import GiftFinder from "@/app/components/store/GiftFinder";
import UnifiedShopCatalog from "@/app/components/store/UnifiedShopCatalog";
import TrackOrderSection from "@/app/components/store/TrackOrderSection";
import KiraBand from "@/app/components/store/KiraBand";
import {
  getAllProducts,
  getCategories,
  getProductsByCategory,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop — Kapruka, reimagined",
  description:
    "Find and send gifts across Sri Lanka — Kira searches live catalog, checks delivery, and checks you out.",
  openGraph: {
    title: "Shop — Kapruka, reimagined",
    description:
      "Intent-first gifting with Kira — cakes, flowers, hampers, delivered islandwide.",
    type: "website",
  },
};

export default async function ShopHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryParam } = await searchParams;
  const categories = await getCategories();
  const activeCategory =
    categoryParam && categories.some((c) => c.slug === categoryParam)
      ? categoryParam
      : null;

  const catalog = activeCategory
    ? await getProductsByCategory(activeCategory, { limit: 12, sort: "featured" })
    : await getAllProducts({ limit: 12, sort: "featured" });

  return (
    <div className="min-h-dvh bg-[#f5f5f7] text-kira-text">
      <StoreNav />
      <TrustBar />

      <main>
        <GiftFinder />

        <Suspense fallback={null}>
          <UnifiedShopCatalog
            categories={categories}
            initialCategory={activeCategory}
            initialItems={catalog.items}
            total={catalog.total}
          />
        </Suspense>

        <TrackOrderSection />

        <div className="mt-16 pb-8">
          <KiraBand />
        </div>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
