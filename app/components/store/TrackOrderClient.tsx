"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Sparkles, ArrowRight } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import TrustBar from "@/app/components/store/TrustBar";
import type { StoreCategory } from "@/types/store";

export default function TrackOrderClient({
  categories,
}: {
  categories: StoreCategory[];
}) {
  const [orderRef, setOrderRef] = useState("");
  const { open } = useKiraDock();

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const ref = orderRef.trim().toUpperCase();
    if (!ref) return;
    open({ prompt: `Track order ${ref}` });
  }

  return (
    <div className="min-h-dvh">
      <StoreNav categories={categories} />
      <TrustBar />

      <main className="mx-auto w-full max-w-lg px-5 py-16 sm:px-8 sm:py-24">
        <div className="text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-kap-purple/20 text-kap-yellow">
            <Package className="size-7" />
          </span>
          <h1 className="display-hero mt-6 text-3xl text-white sm:text-4xl">
            Track your order
          </h1>
          <p className="mt-3 text-[15px] text-white/50">
            Enter your Kapruka order reference — Kira will pull live status from
            the catalog.
          </p>
        </div>

        <form onSubmit={handleTrack} className="mt-10 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-white/70">
              Order reference
            </span>
            <input
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. KP123456789012"
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/6 px-4 py-3.5 text-white outline-none placeholder:text-white/30 focus:border-kap-purple/50"
              autoComplete="off"
            />
            <span className="mt-2 block text-[12px] text-white/35">
              12-digit number from your confirmation email or receipt.
            </span>
          </label>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(64,41,112,0.5)] transition-transform hover:scale-[1.01] active:scale-95"
          >
            Track with Kira
            <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
          <p className="text-sm text-white/55">
            Prefer conversation?{" "}
            <button
              type="button"
              onClick={() => open({ prompt: "I want to track my order" })}
              className="inline-flex items-center gap-1 font-semibold text-kap-yellow hover:underline"
            >
              <Sparkles className="size-3.5" />
              Ask Kira
            </button>
          </p>
          <Link
            href="/shop"
            className="mt-3 inline-block text-[13px] text-white/40 hover:text-white/70"
          >
            ← Back to shop
          </Link>
        </div>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
