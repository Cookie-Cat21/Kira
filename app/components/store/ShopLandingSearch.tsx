"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlass } from "@/app/components/glass";
import DiscoverGlassBar from "@/app/components/glass/DiscoverGlassBar";
import type { KiraProduct } from "@/types";

const POPULAR = [
  "Birthday cakes",
  "Flower delivery Colombo",
  "Chocolate hamper",
  "Same-day gifts",
] as const;

type Suggestion = { label: string };

const CATEGORY_SLUGS: { pattern: RegExp; slug: string }[] = [
  { pattern: /\b(cakes?|birthday cake)\b/i, slug: "cakes" },
  { pattern: /\b(flowers?|roses?|bouquet)\b/i, slug: "flowers" },
  { pattern: /\b(chocolates?|chocolate)\b/i, slug: "chocolates" },
  { pattern: /\b(hampers?|gift hamper)\b/i, slug: "hampers" },
];

function categorySlugFromQuery(q: string): string | null {
  for (const { pattern, slug } of CATEGORY_SLUGS) {
    if (pattern.test(q)) return slug;
  }
  return null;
}

async function resolveStoreSearch(term: string): Promise<string> {
  const q = term.trim();
  if (!q) return "/kira";

  try {
    const res = await fetch(`/api/store/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as { items?: KiraProduct[] };
      const items = Array.isArray(data.items) ? data.items : [];
      const lower = q.toLowerCase();

      const exact = items.find((p) => p.name.toLowerCase() === lower);
      if (exact) return `/product/${exact.id}`;

      if (items.length === 1) return `/product/${items[0].id}`;

      const slug = categorySlugFromQuery(q);
      if (slug) return `/shop/${slug}`;
    }
  } catch {
    /* fall through to Kira */
  }

  return `/kira?prompt=${encodeURIComponent(q)}`;
}

export default function ShopLandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const goSearch = async (prompt?: string) => {
    const term = prompt?.trim();
    if (!term) {
      router.push("/kira");
      return;
    }
    router.push(await resolveStoreSearch(term));
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
        onSearch={(value) => void goSearch(value)}
        onActivate={() => void goSearch(query)}
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
                  onClick={() => void goSearch(s.label)}
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
