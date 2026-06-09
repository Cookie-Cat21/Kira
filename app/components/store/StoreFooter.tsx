import Link from "next/link";
import type { StoreCategory } from "@/types/store";

export default function StoreFooter({ categories }: { categories: StoreCategory[] }) {
  return (
    <footer className="mt-24 border-t border-white/8">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <h3 className="display-hero text-xl text-white">Kapruka</h3>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/45">
              Sri Lanka&apos;s gifting destination — now with Kira, your AI
              shopping companion. Delivered islandwide.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop/${c.slug}`}
                    className="text-[13px] text-white/60 transition-colors hover:text-white"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Assistant
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/kira" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Open Kira
                </Link>
              </li>
              <li className="text-[13px] text-white/60">Delivery &amp; tracking</li>
              <li className="text-[13px] text-white/60">Gift hampers</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              About
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li className="text-[13px] text-white/60">Islandwide delivery</li>
              <li className="text-[13px] text-white/60">Powered by Kapruka MCP</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
          <p className="text-[12px] text-white/35">
            © {new Date().getFullYear()} Kapruka. Demo storefront.
          </p>
          <p className="text-[12px] text-white/35">
            Built with Kira · Live catalog · Dark liquid-glass
          </p>
        </div>
      </div>
    </footer>
  );
}
