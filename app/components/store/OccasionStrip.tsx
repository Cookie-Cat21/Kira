"use client";

import { useKiraDock } from "@/app/context/KiraDockContext";

const OCCASIONS = [
  { label: "Birthday", prompt: "I need a birthday gift" },
  { label: "Anniversary", prompt: "I need an anniversary gift" },
  { label: "Thank you", prompt: "I need a thank-you gift" },
  { label: "Get well", prompt: "I need a get-well gift" },
  { label: "New baby", prompt: "I need a new baby gift" },
  { label: "Father's Day", prompt: "I need a Father's Day gift" },
];

export default function OccasionStrip() {
  const { open } = useKiraDock();

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/35">
        Shop by occasion
      </p>
      <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {OCCASIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => open({ prompt: `${o.prompt} — help me pick something in Sri Lanka` })}
            className="glass-chip shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:text-white"
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
