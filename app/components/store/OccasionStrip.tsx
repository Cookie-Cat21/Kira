"use client";

import { useKiraDock } from "@/app/context/KiraDockContext";

const OCCASIONS = [
  { label: "Birthday", prompt: "I need a birthday gift" },
  { label: "Anniversary", prompt: "I need an anniversary gift" },
  { label: "Thank you", prompt: "I need a thank-you gift" },
  { label: "Get well", prompt: "I need a get-well gift" },
];

export default function OccasionStrip() {
  const { open } = useKiraDock();

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <p className="mb-3 text-[15px] font-medium text-kira-text-2">Popular occasions</p>
      <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {OCCASIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => open({ prompt: `${o.prompt} — help me pick something in Sri Lanka` })}
            className="min-h-11 shrink-0 rounded-full border border-kira-border bg-white px-5 text-[15px] font-medium text-kira-text transition-colors hover:border-kap-purple/30 hover:text-kap-purple"
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
