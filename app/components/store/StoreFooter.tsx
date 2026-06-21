import Link from "next/link";
import type { StoreCategory } from "@/types/store";
import ShopFaq from "./ShopFaq";

export default function StoreFooter({ categories }: { categories: StoreCategory[] }) {
  return (
    <footer className="mt-24 border-t border-kira-border bg-white">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <h3 className="display-hero text-xl text-kira-text">Kapruka</h3>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-kira-text-2">
                Sri Lanka&apos;s gifting destination — with Kira, your AI shopping
                companion. Delivered islandwide.
              </p>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold text-kira-text">Shop</h4>
              <ul className="mt-4 space-y-2.5">
                {categories.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/shop?category=${c.slug}`}
                      className="text-[15px] text-kira-text-2 transition-colors hover:text-kap-purple"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold text-kira-text">Help</h4>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/" className="text-[15px] text-kira-text-2 hover:text-kap-purple">
                    Open Kira
                  </Link>
                </li>
                <li>
                  <Link href="/shop#track" className="text-[15px] text-kira-text-2 hover:text-kap-purple">
                    Track order
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="text-[15px] text-kira-text-2 hover:text-kap-purple">
                    Gift finder
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <ShopFaq />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-kira-border pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-kira-muted">
            © {new Date().getFullYear()} Kapruka. Demo storefront.
          </p>
          <p className="text-[13px] text-kira-muted">Built with Kira · Live Kapruka MCP catalog</p>
        </div>
      </div>
    </footer>
  );
}
