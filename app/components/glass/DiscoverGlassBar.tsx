"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import LiquidGlass from "./LiquidGlass";
import { KiraOrb } from "@/app/components/KiraOrb";


type DiscoverGlassBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
};

function GlassCapsule({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <LiquidGlass
      radius={999}
      blur={10}
      interactive={false}
      className={`h-[60px] ${className}`}
      contentClassName="flex h-full items-center"
    >
      {children}
    </LiquidGlass>
  );
}

export default function DiscoverGlassBar({
  query,
  onQueryChange,
  onSearch,
  onFocus,
  onBlur,
  placeholder = "Search cakes, flowers, gifts…",
  className = "",
}: DiscoverGlassBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(query);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onQueryChange("");
    }
  };

  return (
    <div className={`flex h-[60px] items-center gap-3 ${className}`}>
      <GlassCapsule className="w-full flex-1">
        <div className="flex w-full items-center overflow-hidden px-[1.125rem]">
          <KiraOrb size={28} className="shrink-0" />
          <div className="ml-3 flex min-w-0 flex-1 items-center">
            <input
              ref={inputRef}
              type="search"
              value={query}
              placeholder={placeholder}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              className="w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-white/35 focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
              aria-label="Search Kapruka catalog"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </GlassCapsule>
    </div>
  );
}
