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
    <div className="border-b border-kira-border bg-white">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-3 sm:justify-between sm:px-8">
        {ITEMS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-kira-text-2"
          >
            <Icon className="size-4 text-kap-purple" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
