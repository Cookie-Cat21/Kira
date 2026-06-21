"use client";

import { useState } from "react";
import { Package, ArrowRight } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Reveal from "./Reveal";

export default function TrackOrderSection() {
  const [orderRef, setOrderRef] = useState("");
  const { open } = useKiraDock();

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const ref = orderRef.trim().toUpperCase();
    if (!ref) return;
    open({ prompt: `Track order ${ref}` });
  }

  return (
    <section id="track" className="scroll-mt-24 border-t border-kira-border bg-kira-bg">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center lg:gap-16">
          <Reveal>
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-kap-purple shadow-sm">
              <Package className="size-6" />
            </span>
            <h2 className="display-hero mt-5 text-3xl text-kira-text sm:text-4xl">
              Track your order
            </h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-kira-text-2">
              Enter your Kapruka order reference and Kira will pull live delivery
              status — no hunting through emails.
            </p>
            <button
              type="button"
              onClick={() => open({ prompt: "I want to track my order" })}
              className="mt-5 text-[15px] font-semibold text-kap-purple hover:underline"
            >
              Ask Kira without the number
            </button>
          </Reveal>

          <Reveal delay={80}>
            <form
              onSubmit={handleTrack}
              className="space-y-4 rounded-2xl border border-kira-border bg-white p-6 shadow-sm"
            >
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
