"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, LayoutGrid, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LiquidGlass from "./LiquidGlass";

const SPRING = { type: "spring" as const, damping: 20, stiffness: 230, mass: 1.2 };
const FADE = { duration: 0.2 };

export const DISCOVER_TABS = [
  {
    id: "popular" as const,
    label: "Popular",
    icon: Flame,
    activeClass: "text-kap-yellow",
    bubbleClass: "bg-kap-yellow/15",
  },
  {
    id: "browse" as const,
    label: "Browse",
    icon: LayoutGrid,
    activeClass: "text-white",
    bubbleClass: "bg-white/12",
  },
];

export type DiscoverTabId = (typeof DISCOVER_TABS)[number]["id"];

type DiscoverGlassBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
  activeTab: DiscoverTabId;
  onTabChange: (tab: DiscoverTabId) => void;
  placeholder?: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
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
  activeTab,
  onTabChange,
  placeholder = "Search cakes, flowers, gifts…",
  isExpanded,
  onExpandedChange,
  className = "",
}: DiscoverGlassBarProps) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spring = reduceMotion ? { duration: 0 } : SPRING;

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  const collapse = () => {
    onExpandedChange(false);
    onQueryChange("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(query);
    } else if (e.key === "Escape") {
      e.preventDefault();
      collapse();
    }
  };

  return (
    <div className={`flex h-[60px] items-center gap-3 ${className}`}>
      {/* Search — expands on tap */}
      <motion.div
        layout={!reduceMotion}
        transition={spring}
        onClick={() => !isExpanded && onExpandedChange(true)}
        className={`relative min-w-0 cursor-pointer ${isExpanded ? "flex-1" : ""}`}
      >
        <GlassCapsule className="w-full">
          <div className="flex w-full items-center overflow-hidden px-[1.125rem]">
            <Search className="size-6 shrink-0 text-white/75" aria-hidden />

            <motion.div
              initial={false}
              animate={{
                width: isExpanded ? "auto" : 0,
                opacity: isExpanded ? 1 : 0,
                filter: isExpanded ? "blur(0px)" : "blur(4px)",
                marginLeft: isExpanded ? 12 : 0,
              }}
              transition={spring}
              className="flex min-w-0 flex-1 items-center overflow-hidden"
            >
              <input
                ref={inputRef}
                type="search"
                value={query}
                placeholder={placeholder}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-white/35 focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
                aria-label="Search Kapruka catalog"
              />
            </motion.div>
          </div>
        </GlassCapsule>
      </motion.div>

      {/* Tabs ↔ close */}
      <motion.div layout={!reduceMotion} transition={spring} className="shrink-0">
        <GlassCapsule>
          <motion.div
            initial={false}
            animate={{ width: isExpanded ? 60 : "auto" }}
            transition={spring}
            className="relative flex h-full items-center overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded ? 0 : 1,
                filter: isExpanded ? "blur(4px)" : "blur(0px)",
              }}
              transition={FADE}
              className="flex items-center whitespace-nowrap px-1.5"
              style={{ pointerEvents: isExpanded ? "none" : "auto" }}
            >
              {DISCOVER_TABS.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  active={activeTab === tab.id}
                  onSelect={() => onTabChange(tab.id)}
                  reduceMotion={!!reduceMotion}
                />
              ))}
            </motion.div>

            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                filter: isExpanded ? "blur(0px)" : "blur(4px)",
              }}
              transition={FADE}
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: isExpanded ? "auto" : "none" }}
            >
              <button
                type="button"
                onClick={collapse}
                aria-label="Close search"
                className="lg-press flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </motion.div>
        </GlassCapsule>
      </motion.div>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
  reduceMotion,
}: {
  tab: (typeof DISCOVER_TABS)[number];
  active: boolean;
  onSelect: () => void;
  reduceMotion: boolean;
}) {
  const Icon = tab.icon as LucideIcon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
        active ? tab.activeClass : "text-white/55 hover:text-white/80"
      }`}
    >
      {active && (
        <motion.span
          layoutId={reduceMotion ? undefined : "discover-glass-bubble"}
          className={`absolute inset-0 z-0 ${tab.bubbleClass}`}
          style={{ borderRadius: 9999 }}
          transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
        />
      )}
      <Icon className={`relative z-10 size-5 ${active ? tab.activeClass : ""}`} />
      <span className="relative z-10">{tab.label}</span>
    </button>
  );
}
