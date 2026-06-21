"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OCCASIONS = ["Birthday", "Anniversary", "Thank you", "Get well", "Just because"];
const RECIPIENTS = ["Mom", "Dad", "Partner", "Friend", "Colleague"];
const CITIES = ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo"];
const BUDGETS = [
  { label: "Rs. 5,000", value: 5000 },
  { label: "Rs. 10,000", value: 10000 },
  { label: "Rs. 15,000", value: 15000 },
  { label: "Rs. 25,000", value: 25000 },
];

const QUICK_OCCASIONS = ["Birthday", "Anniversary", "Thank you", "Get well"] as const;

export default function GiftFinder() {
  const { open } = useKiraDock();
  const [occasion, setOccasion] = useState("Birthday");
  const [recipient, setRecipient] = useState("Partner");
  const [city, setCity] = useState("Colombo");
  const [budget, setBudget] = useState("10000");

  const prompt = useMemo(() => {
    const max = Number(budget);
    const budgetPart = max ? ` under Rs. ${max.toLocaleString("en-LK")}` : "";
    return `I need a ${occasion.toLowerCase()} gift for my ${recipient.toLowerCase()} in ${city}${budgetPart}. Help me find something they'll love on Kapruka.`;
  }, [occasion, recipient, city, budget]);

  const budgetLabel =
    BUDGETS.find((b) => String(b.value) === budget)?.label ?? "Rs. 10,000";

  function handleAskKira() {
    open({
      prompt,
      commerce: {
        city,
        budget: `Under LKR ${Number(budget).toLocaleString("en-LK")}`,
        occasion,
        recipient,
      },
    });
  }

  return (
    <section className="relative overflow-hidden bg-kira-bg">
      <div className="spotlight pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-14 pt-12 sm:px-8 lg:pb-16 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-16">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-kap-purple/8 px-3 py-1 text-[13px] font-medium text-kap-purple">
              <Sparkles className="size-3.5" />
              Kira · live Kapruka catalog
            </p>
            <h1 className="display-hero text-[clamp(2.25rem,5vw,3.5rem)] tracking-[-0.03em] text-kira-text">
              Send the right gift to Sri Lanka.
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-kira-text-2">
              Build your request in plain English — Kira searches the catalog,
              checks delivery to your city, and handles checkout in one
              conversation.
            </p>
            <ul className="mt-6 hidden gap-3 text-[15px] text-kira-text-2 sm:flex sm:flex-col">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-kap-purple" />
                Same-day options in Colombo when available
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-kap-purple" />
                Send from overseas — pay online, deliver islandwide
              </li>
            </ul>
          </div>

          {/* Intent builder */}
          <div
            className="rounded-3xl border border-kira-border bg-white p-6 shadow-sm sm:p-7"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAskKira();
              }
            }}
          >
            <p className="text-[13px] font-semibold uppercase tracking-wide text-kira-muted">
              Your gift brief
            </p>

            <div
              className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-3 text-[17px] leading-[1.55] text-kira-text"
              role="group"
              aria-label="Describe your gift"
            >
              <span>I need a</span>
              <InlineSelect
                value={occasion}
                options={OCCASIONS}
                onChange={setOccasion}
                ariaLabel="Occasion"
              />
              <span>gift for my</span>
              <InlineSelect
                value={recipient}
                options={RECIPIENTS}
                onChange={setRecipient}
                ariaLabel="Recipient"
              />
              <span>in</span>
              <InlineSelect
                value={city}
                options={CITIES}
                onChange={setCity}
                ariaLabel="Delivery city"
              />
              <span>under</span>
              <InlineSelect
                value={budget}
                options={BUDGETS.map((b) => ({
                  label: b.label,
                  value: String(b.value),
                }))}
                onChange={setBudget}
                ariaLabel="Budget"
              />
              <span className="text-kira-muted">.</span>
            </div>

            {/* Live preview — shows what Kira receives */}
            <p className="mt-5 rounded-xl bg-kira-bg px-3.5 py-2.5 text-[15px] leading-snug text-kira-text-2">
              <span className="font-medium text-kira-text">Kira hears: </span>
              &ldquo;{occasion} gift for {recipient.toLowerCase()} in {city},
              under {budgetLabel}.&rdquo;
            </p>

            {/* Quick occasion picks — sync with form, no duplicate strip below */}
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-medium text-kira-muted">
                Popular occasions
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_OCCASIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setOccasion(label)}
                    className={cn(
                      "min-h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                      occasion === label
                        ? "bg-kap-purple text-white"
                        : "border border-kira-border bg-white text-kira-text hover:border-kap-purple/30 hover:text-kap-purple"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-full bg-kap-purple px-8 text-[15px] font-semibold hover:bg-kap-purple/90 sm:w-auto"
                onClick={handleAskKira}
              >
                Ask Kira
                <ArrowRight className="size-4" />
              </Button>
              <p className="text-center text-[13px] text-kira-muted sm:text-left">
                Opens full-screen chat
                <span className="hidden sm:inline"> · ⌘↵</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InlineSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: string[] | { label: string; value: string }[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  return (
    <span className="inline-flex align-baseline">
      <Label className="sr-only">{ariaLabel}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="inline-flex h-auto min-h-9 gap-0.5 rounded-md border-0 border-b-2 border-kap-purple/35 bg-transparent px-0.5 pb-0.5 text-[17px] font-semibold text-kap-purple shadow-none hover:border-kap-purple/60 focus-visible:border-kap-purple focus-visible:ring-0 data-[size=default]:h-auto"
          aria-label={ariaLabel}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {normalized.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
