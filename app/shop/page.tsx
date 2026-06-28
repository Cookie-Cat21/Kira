import StoreNav from "@/app/components/store/StoreNav";
import StoreHero from "@/app/components/store/StoreHero";
import { LiquidGlassFilters } from "@/app/components/glass";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop — Kapruka",
  description:
    "Kapruka gifts delivered islandwide. Cakes, flowers, hampers and more — or just ask Kira.",
  openGraph: {
    title: "Shop — Kapruka",
    description:
      "Kapruka gifts delivered islandwide. Cakes, flowers, hampers and more.",
    type: "website",
  },
};

export default async function ShopHomePage() {
  const categories = await getCategories();

  return (
    <div className="min-h-dvh bg-kira-canvas text-white">
      <LiquidGlassFilters />
      <StoreNav categories={categories} minimal />
      <main>
        <StoreHero categories={categories} />
      </main>
    </div>
  );
}
