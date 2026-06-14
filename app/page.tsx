import StoreAmbient from "@/app/components/store/StoreAmbient";
import StoreNav from "@/app/components/store/StoreNav";
import StoreHero from "@/app/components/store/StoreHero";
import CategoryRail from "@/app/components/store/CategoryRail";
import ProductRail from "@/app/components/store/ProductRail";
import KiraBand from "@/app/components/store/KiraBand";
import StoreFooter from "@/app/components/store/StoreFooter";
import Reveal from "@/app/components/store/Reveal";
import { getCategories, getRails } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, rails] = await Promise.all([getCategories(), getRails()]);

  return (
    <>
      <StoreAmbient />
      <div className="relative min-h-dvh">
        <StoreNav categories={categories} />

        <main>
          <StoreHero />

          <section className="mx-auto mt-4 w-full max-w-[1200px] px-5 sm:mt-6 sm:px-8">
            <Reveal className="mb-5">
              <p className="liquid-eyebrow">Browse</p>
              <h2 className="display-hero mt-1.5 text-xl text-white sm:text-2xl">
                Shop by category
              </h2>
            </Reveal>
          </section>
          <CategoryRail categories={categories} />

          <div className="mt-24 space-y-24 sm:mt-28 sm:space-y-28">
            {rails.map((rail) => (
              <ProductRail
                key={rail.title}
                title={rail.title}
                subtitle={rail.subtitle}
                items={rail.items}
              />
            ))}
          </div>

          <div className="mt-28 sm:mt-32">
            <KiraBand />
          </div>
        </main>

        <StoreFooter categories={categories} />
      </div>
    </>
  );
}
