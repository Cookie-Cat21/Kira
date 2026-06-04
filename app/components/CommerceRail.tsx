"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Calendar, X, Sparkles, User } from "lucide-react";

export interface CommerceContext {
  city?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
}

// ── City chip ─────────────────────────────────────────────────────────────────

function CityChip({
  city,
  onSet,
  onClear,
}: {
  city?: string;
  onSet: (v: string) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(city ?? "");
      // defer focus so the element is in the DOM
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, city]);

  function commit() {
    const v = draft.trim();
    if (v) onSet(v);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 border border-kap-purple/60 rounded-full px-2.5 py-1 bg-white shadow-sm shrink-0">
        <MapPin className="w-3 h-3 text-kap-purple shrink-0" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="w-20 text-[11px] font-medium text-kira-text outline-none bg-transparent placeholder:text-kira-muted"
          placeholder="e.g. Colombo"
        />
      </div>
    );
  }

  if (city) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Change city"
        className="flex items-center gap-1.5 bg-kap-purple/10 border border-kap-purple/30 text-kap-purple rounded-full px-2.5 py-1 text-[11px] font-semibold hover:bg-kap-purple/15 transition-colors shrink-0 animate-pop-in"
      >
        <MapPin className="w-3 h-3 shrink-0" />
        {city}
        <span
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          role="button"
          aria-label="Clear city"
          className="ml-0.5 hover:opacity-60 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Set your delivery city"
      className="flex items-center gap-1.5 border border-dashed border-kira-border text-kira-muted rounded-full px-2.5 py-1 text-[11px] font-medium hover:border-kap-purple/40 hover:text-kira-text-2 transition-colors shrink-0"
    >
      <MapPin className="w-3 h-3 shrink-0" />
      <span>Your city</span>
    </button>
  );
}

// ── Date chip ─────────────────────────────────────────────────────────────────

function DateChip({
  deliveryDate,
  onSet,
  onClear,
}: {
  deliveryDate?: string;
  onSet: (v: string) => void;
  onClear: () => void;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const formatted = deliveryDate
    ? new Date(deliveryDate + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  function openPicker() {
    const input = hiddenInputRef.current;
    if (!input) return;
    try {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      input.click();
    }
  }

  if (deliveryDate) {
    return (
      <div
        onClick={openPicker}
        title="Change delivery date"
        className="relative flex items-center gap-1.5 bg-kap-purple/10 border border-kap-purple/30 text-kap-purple rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 animate-pop-in cursor-pointer hover:bg-kap-purple/15 transition-colors"
      >
        <Calendar className="w-3 h-3 shrink-0 pointer-events-none" />
        <span className="pointer-events-none">{formatted}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label="Clear delivery date"
          className="ml-0.5 hover:opacity-60 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </button>
        {/* Hidden input — showPicker() target */}
        <input
          ref={hiddenInputRef}
          type="date"
          min={today}
          value={deliveryDate}
          onChange={(e) => e.target.value && onSet(e.target.value)}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
          readOnly={false}
        />
      </div>
    );
  }

  // Ghost chip — overlay input so any click on the chip opens the date picker
  return (
    <label
      title="Set delivery date"
      className="relative flex items-center gap-1.5 border border-dashed border-kira-border text-kira-muted rounded-full px-2.5 py-1 text-[11px] font-medium hover:border-kap-purple/40 hover:text-kira-text-2 transition-colors cursor-pointer shrink-0"
    >
      <Calendar className="w-3 h-3 shrink-0 pointer-events-none" />
      <span className="pointer-events-none">Delivery date</span>
      <input
        type="date"
        min={today}
        onChange={(e) => e.target.value && onSet(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-full"
        tabIndex={-1}
      />
    </label>
  );
}

// ── CommerceRail ──────────────────────────────────────────────────────────────

interface CommerceRailProps {
  context: CommerceContext;
  onChange: (updates: Partial<CommerceContext>) => void;
}

export default function CommerceRail({ context, onChange }: CommerceRailProps) {
  const { city, deliveryDate, budget, occasion, recipient } = context;

  return (
    <div className="shrink-0 border-b border-kira-border bg-white/80 backdrop-blur-sm z-10">
      <div className="scrollbar-hide flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        <CityChip
          city={city}
          onSet={(v) => onChange({ city: v })}
          onClear={() => onChange({ city: undefined })}
        />
        <DateChip
          deliveryDate={deliveryDate}
          onSet={(v) => onChange({ deliveryDate: v })}
          onClear={() => onChange({ deliveryDate: undefined })}
        />

        {budget && (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 animate-pop-in">
            💰 {budget}
          </div>
        )}
        {occasion && (
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 animate-pop-in">
            <Sparkles className="w-3 h-3 shrink-0" />
            {occasion}
          </div>
        )}
        {recipient && (
          <div className="flex items-center gap-1.5 bg-kira-bg border border-kira-border text-kira-text-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 animate-pop-in">
            <User className="w-3 h-3 shrink-0" />
            {recipient}
          </div>
        )}
      </div>
    </div>
  );
}
