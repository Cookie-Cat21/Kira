"use client";

import { useKiraDock } from "@/app/context/KiraDockContext";
import { Button } from "@/components/ui/button";

export default function CategoryKiraBanner({
  categoryName,
  slug,
}: {
  categoryName: string;
  slug: string;
}) {
  const { open } = useKiraDock();

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-kira-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[15px] font-semibold text-kira-text">
          Not sure what to pick from {categoryName}?
        </p>
        <p className="mt-1 text-[15px] text-kira-text-2">
          Tell Kira the occasion, city, and budget — she&apos;ll search this category.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 shrink-0 rounded-full border-kap-purple px-5 text-[15px] font-semibold text-kap-purple hover:bg-kap-purple/5"
        onClick={() =>
          open({
            prompt: `Help me pick the best ${categoryName.toLowerCase()} gift on Kapruka (${slug}) — show me options with delivery checked.`,
          })
        }
      >
        Ask Kira
      </Button>
    </div>
  );
}
