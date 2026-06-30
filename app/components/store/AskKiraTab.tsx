"use client";

import { usePathname } from "next/navigation";
import { useKiraDock } from "@/app/context/KiraDockContext";

export default function AskKiraTab() {
  const pathname = usePathname();
  const { open, isOpen } = useKiraDock();

  const onStore =
    pathname.startsWith("/shop") || pathname.startsWith("/product/");
  if (!onStore || isOpen || pathname === "/" || pathname === "/shop") return null;

  return (
    <button
      type="button"
      onClick={() => open()}
      className="fixed right-0 top-1/2 z-50 rounded-l-lg bg-kap-purple px-2 py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_4px_24px_rgba(64,41,112,0.55)] transition-transform hover:scale-[1.02] active:scale-95"
      style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
      aria-label="Ask Kira"
    >
      Ask Kira ✨
    </button>
  );
}
