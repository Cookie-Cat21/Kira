"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlass } from "@/app/components/glass";
import DiscoverGlassBar from "@/app/components/glass/DiscoverGlassBar";

const POPULAR = [
  "Birthday cakes",
  "Flower delivery Colombo",
  "Chocolate hamper",
  "Same-day gifts",
] as const;

type Suggestion = { label: string };

export default function ShopLandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const goKira = (prompt?: string) => {
    const term = prompt?.trim();
    if (term) {
      router.push(`/kira?prompt=${encodeURIComponent(term)}`);
    } else {
      router.push("/kira");
    }
  };

  const suggestions = useMemo((): Suggestion[] => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR.map((label) => ({ label }));
    return [...POPULAR]
      .filter((label) => label.toLowerCase().includes(q))
      .map((label) => ({ label }));
  }, [query]);

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className="relative w-full max-w-lg">
      <DiscoverGlassBar
        query={query}
        onQueryChange={setQuery}
        onSearch={(value) => goKira(value)}
        onActivate={() => goKira(query)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search cakes, flowers, gifts…"
        className="w-full"
      />

      {showSuggestions && (
        <LiquidGlass
          radius={20}
          blur={14}
          interactive={false}
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 animate-[fade-up_0.16s_ease]"
          contentClassName="max-h-64 overflow-y-auto p-1.5"
        >
          <ul role="listbox" aria-label="Search suggestions">
            {suggestions.map((s) => (
              <li key={s.label} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goKira(s.label)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span className="flex-1 truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </LiquidGlass>
      )}
    </div>
  );
}
