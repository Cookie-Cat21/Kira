import StoreNav from "@/app/components/store/StoreNav";
import StoreHero from "@/app/components/store/StoreHero";
import CategoryRail from "@/app/components/store/CategoryRail";
import ProductRail from "@/app/components/store/ProductRail";
import KiraBand from "@/app/components/store/KiraBand";
import StoreFooter from "@/app/components/store/StoreFooter";
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
      <StoreNav categories={categories} />

      <main>
        <StoreHero />

        {/* Categories */}
        <section className="mx-auto mt-2 w-full max-w-[1280px] px-5 sm:px-8">
          <Reveal className="mb-5">
            <h2 className="display-hero text-2xl text-white sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Everything Kapruka, reimagined dark.
            </p>
          </Reveal>
        </section>
        <CategoryRail categories={categories} />

        {/* Editorial product rails */}
        <div className="mt-28 space-y-28">
          {rails.map((rail) => (
            <ProductRail
              key={rail.title}
              title={rail.title}
              subtitle={rail.subtitle}
              items={rail.items}
            />
          ))}
        </div>

        {/* Meet Kira */}
        <div className="mt-32">
          <KiraBand />
        </div>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
