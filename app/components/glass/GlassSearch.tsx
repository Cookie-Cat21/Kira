"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import LiquidGlass from "./LiquidGlass";
import { IconSearch, IconClose, IconClock } from "./icons";

type Suggestion = string | { label: string; hint?: string; recent?: boolean };

type Props = {
  /** Controlled value. Omit to run uncontrolled. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fired on Enter (or when a suggestion is chosen). */
  onSearch?: (query: string) => void;
  placeholder?: string;
  /** Suggestions to surface in the dropdown. Filtered by the query as you type. */
  suggestions?: Suggestion[];
  /** Keyboard hint shown on the right while empty + unfocused, e.g. "⌘K". */
  kbd?: string;
  /** Corner radius in px. Defaults to a pill. */
  radius?: number;
  /** Optional leading slot override (defaults to a search glyph). */
  icon?: ReactNode;
  className?: string;
  autoFocus?: boolean;
};

const norm = (s: Suggestion) => (typeof s === "string" ? { label: s } : s);

/**
 * Frosted search bar. Leading glyph, clear button once typed, Enter to search,
 * and an optional glass suggestions panel with full arrow-key navigation.
 */
export default function GlassSearch({
  value,
  defaultValue = "",
  onChange,
  onSearch,
  placeholder = "Search…",
  suggestions = [],
  kbd,
  radius = 999,
  icon,
  className = "",
  autoFocus,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const controlled = value !== undefined;
  const query = controlled ? value : inner;

  const matches = useMemo(() => {
    const items = suggestions.map(norm);
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.label.toLowerCase().includes(q));
  }, [suggestions, query]);

  const showPanel = open && matches.length > 0;

  const setQuery = (next: string) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  };

  const commit = (next: string) => {
    setQuery(next);
    onSearch?.(next);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showPanel) {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && showPanel) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showPanel && active >= 0) commit(matches[active].label);
      else commit(query);
    } else if (e.key === "Escape") {
      if (showPanel) {
        setOpen(false);
        setActive(-1);
      } else {
        commit("");
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <LiquidGlass
        radius={radius}
        blur={8}
        interactive={false}
        className="block transition focus-within:ring-2 focus-within:ring-white/45"
        contentClassName="flex h-12 items-center gap-3 px-5"
      >
        <span className="shrink-0 text-white/45">{icon ?? <IconSearch />}</span>

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && active >= 0 ? `${listId}-${active}` : undefined
          }
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKey}
          className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30 [&::-webkit-search-cancel-button]:appearance-none"
        />

        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="lg-press grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-white/55 transition hover:bg-white/15 hover:text-white/80"
          >
            <IconClose width={13} height={13} />
          </button>
        ) : (
          kbd && (
            <kbd className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/40">
              {kbd}
            </kbd>
          )
        )}
      </LiquidGlass>

      {showPanel && (
        <LiquidGlass
          radius={18}
          blur={16}
          interactive={false}
          className="absolute left-0 right-0 top-full z-40 mt-2 animate-[fade-up_0.16s_ease]"
          contentClassName="max-h-72 overflow-y-auto p-1.5"
        >
          <ul id={listId} role="listbox">
            {matches.map((s, i) => (
              <li
                key={`${s.label}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(s.label)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] transition ${
                  i === active ? "bg-white/10 text-white" : "text-white/70"
                }`}
              >
                <span className="shrink-0 text-white/35">
                  {s.recent ? (
                    <IconClock width={15} height={15} />
                  ) : (
                    <IconSearch width={15} height={15} />
                  )}
                </span>
                <span className="flex-1 truncate">{s.label}</span>
                {s.hint && (
                  <span className="shrink-0 text-[12px] text-white/30">{s.hint}</span>
                )}
              </li>
            ))}
          </ul>
        </LiquidGlass>
      )}
    </div>
  );
}
