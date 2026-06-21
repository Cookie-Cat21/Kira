"use client";

import { usePathname } from "next/navigation";
import { useKiraDock } from "@/app/context/KiraDockContext";

/** Corner launcher on store pages — always opens full-screen Kira at `/`. */
export default function KiraDock() {
  const pathname = usePathname();
  const { open } = useKiraDock();

  if (
    pathname === "/" ||
    pathname?.startsWith("/kira") ||
    pathname?.startsWith("/liquid-glass") ||
    pathname?.startsWith("/product")
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Open Kira, your shopping assistant"
      className="fixed bottom-5 right-5 z-[90] flex h-12 items-center gap-2 rounded-full bg-kap-purple px-5 text-[15px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 sm:bottom-6 sm:right-6"
    >
      Ask Kira
    </button>
  );
}
