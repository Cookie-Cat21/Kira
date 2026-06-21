"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, ChevronDown, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SRI_LANKA_CITIES = [
  "Colombo", "Kandy", "Galle", "Negombo", "Jaffna",
  "Kurunegala", "Ratnapura", "Anuradhapura", "Batticaloa",
  "Trincomalee", "Matara", "Hambantota", "Vavuniya",
  "Polonnaruwa", "Kegalle", "Nuwara Eliya", "Badulla",
  "Kalutara", "Gampaha", "Ampara", "Mannar", "Mullaitivu",
  "Puttalam", "Kilinochchi", "Matale",
];

interface CityPickerProps {
  value?: string;
  onChange: (city: string | undefined) => void;
}

export default function CityPicker({ value, onChange }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteCities, setRemoteCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackFiltered = query.trim()
    ? SRI_LANKA_CITIES.filter((c) =>
        c.toLowerCase().startsWith(query.toLowerCase())
      )
    : SRI_LANKA_CITIES;
  const filtered = remoteCities.length > 0 ? remoteCities : fallbackFiltered;

  const select = useCallback(
    (city: string) => {
      onChange(city);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "12" });
        if (query.trim()) params.set("query", query.trim());
        const res = await fetch(`/api/delivery-cities?${params}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as { cities?: { name?: string }[] };
        const names = (body.cities ?? [])
          .map((city) => city.name)
          .filter((name): name is string => Boolean(name));
        setRemoteCities([...new Set(names)]);
      } catch {
        if (!controller.signal.aborted) setRemoteCities([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
          value
            ? "border-kap-purple/30 bg-kap-purple/5 text-kap-purple"
            : "border-kira-border bg-white text-kira-muted hover:text-kira-text"
        )}
        aria-label={value ? `Delivery city: ${value}` : "Set delivery city"}
      >
        <MapPin className="size-3 shrink-0" />
        <span className="max-w-[80px] truncate">
          {value ?? "Delivery city"}
        </span>
        {value ? (
          <X
            className="size-3 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
          />
        ) : (
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-xl border border-kira-border bg-white shadow-lg"
          >
            <div className="border-b border-kira-border px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city…"
                  className="min-w-0 flex-1 bg-transparent text-xs text-kira-text outline-none placeholder:text-kira-muted focus-visible:ring-0"
                />
                {loading && <Loader2 className="size-3 shrink-0 animate-spin text-kira-muted" />}
              </div>
            </div>

            <ul
              className="max-h-48 overflow-y-auto py-1 scrollbar-hide"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-kira-muted">No match</li>
              ) : (
                filtered.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={city === value}
                      onClick={() => select(city)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-kira-bg",
                        city === value ? "font-bold text-kap-purple" : "text-kira-text"
                      )}
                    >
                      {city === value && <MapPin className="size-3 shrink-0" />}
                      {city}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
