"use client";

import { useMemo, useState } from "react";
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

const OCCASIONS = ["Birthday", "Anniversary", "Thank you", "Get well", "Just because"];
const RECIPIENTS = ["Mom", "Dad", "Partner", "Friend", "Colleague"];
const CITIES = ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo"];
const BUDGETS = [
  { label: "Under Rs. 5,000", value: 5000 },
  { label: "Under Rs. 10,000", value: 10000 },
  { label: "Under Rs. 15,000", value: 15000 },
  { label: "Under Rs. 25,000", value: 25000 },
];

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

  return (
    <section className="relative overflow-hidden bg-[#f5f5f7]">
      <div className="spotlight pointer-events-none absolute inset-x-0 top-0 h-[480px]" />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-16 pt-14 sm:px-8 lg:pt-18">
        <h1 className="display-hero max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)] tracking-[-0.03em] text-kira-text">
          Send the right gift to Sri Lanka.
        </h1>

        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-kira-text-2">
          Tell Kira the occasion, who it&apos;s for, and where it&apos;s going. She
          searches the live catalog, checks delivery, and checks you out.
        </p>

        <div className="mt-10 max-w-2xl rounded-2xl border border-kira-border bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[17px] leading-relaxed text-kira-text">
            I need a{" "}
            <InlineSelect
              value={occasion}
              options={OCCASIONS}
              onChange={setOccasion}
              ariaLabel="Occasion"
            />{" "}
            gift for my{" "}
            <InlineSelect
              value={recipient}
              options={RECIPIENTS}
              onChange={setRecipient}
              ariaLabel="Recipient"
            />{" "}
            in{" "}
            <InlineSelect
              value={city}
              options={CITIES}
              onChange={setCity}
              ariaLabel="Delivery city"
            />{" "}
            under{" "}
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              aria-label="Budget"
              className="inline-flex min-h-11 cursor-pointer rounded-lg border border-kira-border bg-[#f5f5f7] px-3 py-2 text-[17px] font-medium text-kap-purple outline-none focus-visible:ring-2 focus-visible:ring-kap-purple/30"
            >
              {BUDGETS.map((b) => (
                <option key={b.value} value={String(b.value)}>
                  {b.label}
                </option>
              ))}
            </select>
            .
          </p>

          <div className="mt-8">
            <Button
              type="button"
              size="lg"
              className="h-12 min-w-[11rem] rounded-full bg-kap-purple px-8 text-[15px] font-semibold hover:bg-kap-purple/90"
              onClick={() => open({ prompt })}
            >
              Ask Kira
            </Button>
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
  options: string[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <span className="inline-block align-baseline">
      <Label className="sr-only">{ariaLabel}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="inline-flex h-11 min-w-[8rem] rounded-lg border-kira-border bg-[#f5f5f7] px-3 text-[17px] font-medium text-kap-purple shadow-none focus-visible:ring-kap-purple/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
