"use client";

import { Sparkles } from "lucide-react";
import { useKiraDock } from "@/app/context/KiraDockContext";

export default function CategoryKiraBanner({
  categoryName,
  slug,
}: {
  categoryName: string;
  slug: string;
}) {
  const { open } = useKiraDock();

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-kap-purple/30 bg-kap-purple/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">
          Not sure what to pick from {categoryName}?
        </p>
        <p className="mt-1 text-[13px] text-white/50">
          Kira knows this category — tell her the occasion, city, and budget.
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          open({
            prompt: `Help me pick the best ${categoryName.toLowerCase()} gift on Kapruka (${slug}) — show me options with delivery checked.`,
          })
        }
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-kap-purple transition-transform hover:scale-[1.02] active:scale-95"
      >
        <Sparkles className="size-4" />
        Ask Kira
      </button>
    </div>
  );
}
