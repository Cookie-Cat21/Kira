"use client";

import { MapPin, CalendarDays, Wallet, Sparkles, User, Package } from "lucide-react";
import type { CommerceContext } from "./CommerceRail";
import type { DeliveryQuote } from "@/types";

interface KiraSidebarProps {
  context: CommerceContext;
  cartCount: number;
  cartTotal: number;
  currency: string;
  deliveryInfo?: DeliveryQuote;
  lastMission?: string;
  className?: string;
}

const lkr = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export default function KiraSidebar({
  context,
  cartCount,
  cartTotal,
  currency,
  deliveryInfo,
  lastMission,
  className = "",
}: KiraSidebarProps) {
  const { city, deliveryDate, budget, occasion, recipient } = context;
  const steps = [
    { label: "Browse picks", done: !!lastMission },
    { label: "Add to tray", done: cartCount > 0 },
    { label: "Delivery quote", done: !!deliveryInfo?.available },
    { label: "Checkout", done: false },
  ];

  return (
    <aside
      className={`hidden w-64 shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 xl:flex ${className}`}
      aria-label="Kira's plan"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          Kira&apos;s plan
        </p>
        <p className="mt-1 text-sm font-semibold text-white/90">
          {lastMission ?? "Tell me what you need — I'll search Kapruka live."}
        </p>
      </div>

      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-2 text-[12px]">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step.done
                  ? "bg-kira-leaf/20 text-kira-leaf"
                  : i === steps.findIndex((s) => !s.done)
                    ? "bg-kap-yellow/20 text-kap-yellow"
                    : "bg-white/5 text-white/30"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <span className={step.done ? "text-white/70" : "text-white/85"}>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 border-t border-white/8 pt-3 text-[11px] text-white/55">
        {city && (
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3 shrink-0" /> {city}
          </p>
        )}
        {deliveryDate && (
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3 shrink-0" /> {deliveryDate}
          </p>
        )}
        {budget && (
          <p className="flex items-center gap-1.5">
            <Wallet className="size-3 shrink-0" /> {budget}
          </p>
        )}
        {occasion && (
          <p className="flex items-center gap-1.5">
            <Sparkles className="size-3 shrink-0" /> {occasion}
          </p>
        )}
        {recipient && (
          <p className="flex items-center gap-1.5">
            <User className="size-3 shrink-0" /> For {recipient}
          </p>
        )}
      </div>

      {cartCount > 0 && (
        <div
          className="rounded-xl border px-3 py-2"
          style={{ borderColor: "rgba(248,218,8,0.25)", background: "rgba(64,41,112,0.3)" }}
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
            <Package className="size-3.5 text-kap-yellow/80" />
            Tray · {cartCount} item{cartCount > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-kap-yellow">
            {lkr.format(cartTotal).replace("LKR", currency === "LKR" ? "LKR" : currency)}
          </p>
          {deliveryInfo?.fee !== undefined && (
            <p className="text-[10px] text-white/50">
              Delivery ~ {lkr.format(deliveryInfo.fee)}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
