import StoreChrome from "@/app/components/store/StoreChrome";
import StoreNav from "@/app/components/store/StoreNav";
import StoreHero from "@/app/components/store/StoreHero";
import MarqueeTicker from "@/app/components/store/MarqueeTicker";
import CategoryRail from "@/app/components/store/CategoryRail";
import OccasionCircles from "@/app/components/store/OccasionCircles";
import CategoryFilterPills from "@/app/components/store/CategoryFilterPills";
import ProductRail from "@/app/components/store/ProductRail";
import EditorialPanels from "@/app/components/store/EditorialPanels";
import StoreFooter from "@/app/components/store/StoreFooter";
import StoreSectionHeading from "@/app/components/store/StoreSectionHeading";
import Reveal from "@/app/components/store/Reveal";
import { getCategories, getRails } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop — Kapruka, reimagined",
  description:
    "Browse Sri Lanka's favourites — cakes, flowers, hampers and more, delivered islandwide. Or just ask Kira.",
  openGraph: {
    title: "Shop — Kapruka, reimagined",
    description:
      "Browse Sri Lanka's favourites — cakes, flowers, hampers and more, delivered islandwide.",
    type: "website",
  },
};

export default async function ShopHomePage() {
  const [categories, rails] = await Promise.all([getCategories(), getRails()]);

  return (
    <div className="min-h-dvh">
      <StoreChrome />
      <StoreNav categories={categories} />

      <main>
        <StoreHero />
        <MarqueeTicker />

        <div className="mt-12">
          <OccasionCircles />
        </div>

        <section className="mx-auto mt-16 w-full max-w-[1280px] px-5 sm:px-8">
          <Reveal className="mb-5">
            <StoreSectionHeading
              title="Shop by category"
              subtitle="Everything Kapruka, reimagined dark."
              href="/shop"
            />
          </Reveal>
        </section>
        <CategoryRail categories={categories} />

        <section className="mx-auto mt-20 w-full max-w-[1280px] px-5 sm:px-8">
          <CategoryFilterPills activeSlug="" />
        </section>

        <div className="mt-20 space-y-28">
          {rails.map((rail) => (
            <ProductRail
              key={rail.title}
              title={rail.title}
              subtitle={rail.subtitle}
              items={rail.items}
              categorySlug={rail.categorySlug}
              viewAllHref={
                rail.categorySlug ? `/shop/${rail.categorySlug}` : "/shop"
              }
            />
          ))}
        </div>

        <div className="mt-32 space-y-8">
          <EditorialPanels />
        </div>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
