"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? SRI_LANKA_CITIES.filter((c) =>
        c.toLowerCase().startsWith(query.toLowerCase())
      )
    : SRI_LANKA_CITIES;

  const select = useCallback(
    (city: string) => {
      onChange(city);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  // Close on outside click
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

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
        style={{
          background: value
            ? "rgba(64,41,112,0.5)"
            : "rgba(255,255,255,0.07)",
          border: value
            ? "1px solid rgba(148,100,255,0.4)"
            : "1px solid rgba(255,255,255,0.12)",
          color: value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
        }}
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
            className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-xl"
            style={{
              background: "rgba(18,10,36,0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(148,100,255,0.25)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Search */}
            <div className="border-b border-white/10 px-3 py-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city…"
                className="w-full bg-transparent text-xs text-white/90 placeholder-white/30 outline-none"
              />
            </div>

            {/* City list */}
            <ul
              className="max-h-48 overflow-y-auto py-1 scrollbar-hide"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-white/35">No match</li>
              ) : (
                filtered.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={city === value}
                      onClick={() => select(city)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
                      style={{
                        color: city === value ? "#f8da08" : "rgba(255,255,255,0.8)",
                        fontWeight: city === value ? 700 : 400,
                      }}
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
