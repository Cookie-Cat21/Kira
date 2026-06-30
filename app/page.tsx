import StoreNav from "@/app/components/store/StoreNav";
import StoreHero from "@/app/components/store/StoreHero";
import { LiquidGlassFilters } from "@/app/components/glass";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kapruka — Gifting, reimagined with Kira",
  description:
    "Kapruka gifts delivered islandwide. Cakes, flowers, hampers and more — or just ask Kira.",
  openGraph: {
    title: "Kapruka — Gifting, reimagined with Kira",
    description:
      "Kapruka gifts delivered islandwide. Cakes, flowers, hampers and more.",
    type: "website",
  },
};

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="min-h-dvh bg-kira-canvas text-white">
      <LiquidGlassFilters />
      <StoreNav categories={categories} minimal homeHref="/" />
      <main>
        <StoreHero categories={categories} />
      </main>
    </div>
  );
}
