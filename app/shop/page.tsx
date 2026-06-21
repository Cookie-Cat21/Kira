import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import TrustBar from "@/app/components/store/TrustBar";
import GiftFinder from "@/app/components/store/GiftFinder";
import OccasionStrip from "@/app/components/store/OccasionStrip";
import CategoryRail from "@/app/components/store/CategoryRail";
import ProductRail from "@/app/components/store/ProductRail";
import KiraBand from "@/app/components/store/KiraBand";
import Reveal from "@/app/components/store/Reveal";
import { getCategories, getRails } from "@/lib/catalog";

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

export default async function ShopHomePage() {
  const [categories, rails] = await Promise.all([getCategories(), getRails()]);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] text-kira-text">
      <StoreNav categories={categories} />
      <TrustBar />

      <main>
        {/* 1. Intent-first — replaces legacy category wall */}
        <GiftFinder />

        {/* 2. Occasion shortcuts → Kira */}
        <div className="mt-12">
          <OccasionStrip />
        </div>

        {/* 3. Editorial picks — merchandising without overload */}
        <div className="mt-20 space-y-20">
          {rails.map((rail) => (
            <ProductRail
              key={rail.title}
              title={rail.title}
              subtitle={rail.subtitle}
              items={rail.items}
            />
          ))}
        </div>

        {/* 4. Categories — secondary, horizontal scroll (not a wall) */}
        <section className="mx-auto mt-24 w-full max-w-[1280px] px-5 sm:px-8">
          <Reveal className="mb-5">
            <h2 className="display-hero text-2xl text-kira-text sm:text-3xl">
              Or browse by department
            </h2>
            <p className="mt-1 text-[15px] text-kira-text-2">
              Kapruka&apos;s full catalog — when you know what you want.
            </p>
          </Reveal>
        </section>
        <CategoryRail categories={categories} />

        {/* 5. Kira story */}
        <div className="mt-32 pb-8">
          <KiraBand />
        </div>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
