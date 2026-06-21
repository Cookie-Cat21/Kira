"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, MapPin, Wallet, User } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";

const OCCASIONS = ["Birthday", "Anniversary", "Thank you", "Get well", "Just because"];
const RECIPIENTS = ["Mom", "Dad", "Partner", "Friend", "Colleague"];
const CITIES = ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo"];
const BUDGETS = ["Under 5,000", "Under 10,000", "Under 15,000", "Under 25,000"];

function parseBudget(text: string): number | undefined {
  const m = text.match(/([\d,]+)/);
  if (!m) return undefined;
  return parseInt(m[1].replace(/,/g, ""), 10);
}

export default function GiftFinder() {
  const { open } = useKiraDock();
  const [occasion, setOccasion] = useState("Birthday");
  const [recipient, setRecipient] = useState("Partner");
  const [city, setCity] = useState("Colombo");
  const [budget, setBudget] = useState("Under 10,000");

  function buildPrompt() {
    const max = parseBudget(budget);
    const budgetPart = max ? ` under Rs. ${max.toLocaleString("en-LK")}` : "";
    return `I need a ${occasion.toLowerCase()} gift for my ${recipient.toLowerCase()} in ${city}${budgetPart}. Help me find something they'll love on Kapruka.`;
  }

  function handleFind() {
    open({ prompt: buildPrompt() });
  }

  return (
    <section className="relative overflow-hidden">
      <div className="spotlight pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-80px",
          right: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(64,41,112,0.5) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-14 pt-16 sm:px-8 lg:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full glass-chip px-3 py-1 text-[12px] font-medium text-white/70">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-kira-leaf opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-kira-leaf" />
          </span>
          Kapruka, rebuilt for 2026
        </span>

        <h1 className="display-hero mt-5 max-w-2xl text-4xl tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
          Send the right gift to{" "}
          <span className="bg-gradient-to-r from-kap-yellow to-[#ffe87a] bg-clip-text text-transparent">
            Sri Lanka
          </span>
          — without the guesswork.
        </h1>

        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/50">
          Tell us the occasion, who it&apos;s for, and where it&apos;s going. Kira
          searches the live Kapruka catalog, checks delivery, and checks you out.
        </p>

        {/* Gift brief composer */}
        <div className="mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
            Gift brief
          </p>

          <div className="space-y-4">
            <Field label="Occasion" icon={Sparkles}>
              <ChipRow options={OCCASIONS} value={occasion} onChange={setOccasion} />
            </Field>
            <Field label="Recipient" icon={User}>
              <ChipRow options={RECIPIENTS} value={recipient} onChange={setRecipient} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Deliver to" icon={MapPin}>
                <ChipRow options={CITIES} value={city} onChange={setCity} compact />
              </Field>
              <Field label="Budget" icon={Wallet}>
                <ChipRow options={BUDGETS} value={budget} onChange={setBudget} compact />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleFind}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-kap-purple to-[#6d4ec9] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(64,41,112,0.55)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="size-4 text-kap-yellow" />
              Find gifts with Kira
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
            >
              Open full-screen chat
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <p className="mt-4 text-[12px] text-white/30">
            Preview: &ldquo;{buildPrompt()}&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
        <Icon className="size-3" />
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  compact,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt
              ? "bg-kap-purple text-white"
              : "bg-white/6 text-white/65 hover:bg-white/10 hover:text-white"
          } ${compact ? "text-[11px]" : ""}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
