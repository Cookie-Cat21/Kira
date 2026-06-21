"use client";

import { Truck, ShieldCheck, Globe, MessageCircle } from "lucide-react";

const ITEMS = [
  { icon: Truck, label: "Islandwide delivery" },
  { icon: ShieldCheck, label: "Live Kapruka catalog" },
  { icon: Globe, label: "Send from overseas" },
  { icon: MessageCircle, label: "WhatsApp 1297" },
];

export default function TrustBar() {
  return (
    <div className="border-b border-white/6 bg-white/[0.02]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-2.5 sm:justify-between sm:px-8">
        {ITEMS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/45"
          >
            <Icon className="size-3.5 text-kira-leaf/80" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
