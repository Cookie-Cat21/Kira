"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import StoreNav from "@/app/components/store/StoreNav";
import StoreFooter from "@/app/components/store/StoreFooter";
import TrustBar from "@/app/components/store/TrustBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-dvh bg-[#f5f5f7] text-kira-text">
      <StoreNav categories={categories} />
      <TrustBar />

      <main className="mx-auto w-full max-w-lg px-5 py-16 sm:px-8 sm:py-24">
        <div className="text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-kap-purple shadow-sm">
            <Package className="size-7" />
          </span>
          <h1 className="display-hero mt-6 text-3xl sm:text-4xl">Track your order</h1>
          <p className="mt-3 text-[17px] text-kira-text-2">
            Enter your Kapruka order reference. Kira will pull live status.
          </p>
        </div>

        <form onSubmit={handleTrack} className="mt-10 space-y-4 rounded-2xl border border-kira-border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="order-ref" className="text-[15px]">
              Order reference
            </Label>
            <Input
              id="order-ref"
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. KP123456789012"
              className="h-12 text-[17px]"
              autoComplete="off"
            />
            <p className="text-[13px] text-kira-muted">
              12-digit number from your confirmation email or receipt.
            </p>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-full bg-kap-purple text-[17px] font-semibold hover:bg-kap-purple/90"
          >
            Track with Kira
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] text-kira-text-2">
          <button
            type="button"
            onClick={() => open({ prompt: "I want to track my order" })}
            className="font-semibold text-kap-purple hover:underline"
          >
            Ask Kira without the number
          </button>
          <span className="mx-2 text-kira-muted">·</span>
          <Link href="/shop" className="text-kap-purple hover:underline">
            Back to shop
          </Link>
        </p>
      </main>

      <StoreFooter categories={categories} />
    </div>
  );
}
