import Link from "next/link";
import type { StoreCategory } from "@/types/store";

export default function StoreFooter({ categories }: { categories: StoreCategory[] }) {
  return (
    <footer className="mt-32">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="rounded-[24px] liquid-glass px-8 py-12 sm:px-12">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <h3 className="display-serif text-lg text-white/90">Kapruka</h3>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/38">
                Sri Lanka&apos;s gifting destination — with Kira, your AI
                shopping companion. Delivered islandwide.
              </p>
            </div>

            <div>
              <h4 className="liquid-eyebrow">Shop</h4>
              <ul className="mt-4 space-y-2">
                {categories.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/shop/${c.slug}`}
                      className="text-[13px] text-white/50 transition-colors hover:text-white/85"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="liquid-eyebrow">Assistant</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/kira" className="text-[13px] text-white/50 transition-colors hover:text-white/85">
                    Open Kira
                  </Link>
                </li>
                <li className="text-[13px] text-white/50">Delivery &amp; tracking</li>
                <li className="text-[13px] text-white/50">Gift hampers</li>
              </ul>
            </div>

            <div>
              <h4 className="liquid-eyebrow">About</h4>
              <ul className="mt-4 space-y-2">
                <li className="text-[13px] text-white/50">Islandwide delivery</li>
                <li className="text-[13px] text-white/50">Powered by Kapruka MCP</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
            <p className="text-[11px] text-white/28">
              © {new Date().getFullYear()} Kapruka
            </p>
            <p className="text-[11px] text-white/28">
              Built with Kira · Live catalog
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
