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
      <div className="spotlight pointer-events-none absolute inset-x-0 -top-10 h-72" />
      <Reveal className="relative overflow-hidden rounded-3xl glass-card-vivid p-8 sm:p-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-[12px] font-medium text-kap-yellow">
              <Sparkles className="size-3.5" /> Meet Kira
            </span>
            <h2 className="display-hero mt-4 text-3xl text-white sm:text-4xl">
              Shopping, by conversation.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
              Kira is your shopping companion built into Kapruka. Tell her the
              occasion, budget and city — she finds the gift, checks delivery,
              and checks you out. The store and the assistant share one bag.
            </p>
            <button
              type="button"
              onClick={open}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(64,41,112,0.55)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Sparkles className="size-4 text-kap-yellow" /> Start a conversation
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {POINTS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 80}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
              >
                <p.icon className="size-5 text-kap-yellow" />
                <h3 className="mt-3 text-sm font-semibold text-white">{p.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
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
