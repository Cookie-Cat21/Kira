"use client";

import { Sparkles, MessageCircle, Truck, CreditCard } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import Reveal from "./Reveal";

const POINTS = [
  { icon: MessageCircle, title: "Just say what you need", body: "“Chocolate cake under 5,000 to Kandy by Saturday.” Kira gets it." },
  { icon: Truck, title: "Real delivery, checked live", body: "She confirms availability, fees and dates before you commit." },
  { icon: CreditCard, title: "Checkout in the chat", body: "From idea to paid order without leaving the conversation." },
];

export default function KiraBand() {
  const { open } = useKiraDock();
  return (
    <section className="relative mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <Reveal className="relative overflow-hidden rounded-3xl border border-kira-border bg-white p-8 shadow-sm sm:p-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-kap-purple/10 px-3 py-1 text-[12px] font-medium text-kap-purple">
              <Sparkles className="size-3.5" /> Meet Kira
            </span>
            <h2 className="display-hero mt-4 text-3xl text-kira-text sm:text-4xl">
              Shopping, by conversation.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-kira-text-2">
              Kira is your shopping companion built into Kapruka. Tell her the
              occasion, budget and city — she finds the gift, checks delivery,
              and checks you out. The store and the assistant share one bag.
            </p>
            <button
              type="button"
              onClick={() => open()}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-kap-purple px-6 py-3 text-sm font-semibold text-white transition-transform hover:bg-kap-purple/90 active:scale-95"
            >
              <Sparkles className="size-4 text-kap-yellow" /> Start a conversation
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {POINTS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 80}
                className="rounded-2xl border border-kira-border bg-kira-bg p-5"
              >
                <p.icon className="size-5 text-kap-purple" />
                <h3 className="mt-3 text-sm font-semibold text-kira-text">{p.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-kira-text-2">
                  {p.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
