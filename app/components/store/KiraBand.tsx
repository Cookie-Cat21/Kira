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
    <section className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      <div className="spotlight pointer-events-none absolute inset-x-0 -top-10 h-64" />
      <Reveal className="relative overflow-hidden rounded-[28px] liquid-glass p-8 sm:p-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="liquid-eyebrow inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-white/40" /> Kira
            </span>
            <h2 className="display-serif mt-3 text-3xl font-normal text-white sm:text-4xl">
              Shopping, by conversation.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/42">
              Tell Kira the occasion, budget and city — she finds the gift,
              checks delivery, and checks you out. One bag for store and chat.
            </p>
            <button
              type="button"
              onClick={open}
              className="liquid-btn-accent mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              <Sparkles className="size-4 opacity-90" /> Start a conversation
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {POINTS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 80}
                className="rounded-[18px] liquid-glass-card p-5"
              >
                <p.icon className="size-4 text-white/50" />
                <h3 className="mt-3 text-[13px] font-semibold tracking-tight text-white/90">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/38">
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
