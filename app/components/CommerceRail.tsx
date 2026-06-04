"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Calendar, X, Sparkles, User, Wallet } from "lucide-react";

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
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

  function startEditing() {
    setDraft(city ?? "");
    setEditing(true);
  }

  function commit() {
    const v = draft.trim();
    if (v) onSet(v);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-kap-purple/60 bg-white px-2.5 py-1 shadow-sm">
        <MapPin className="size-3 shrink-0 text-kap-purple" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="w-20 bg-transparent text-[11px] font-medium text-kira-text outline-none placeholder:text-kira-muted"
          placeholder="e.g. Colombo"
        />
      </div>
    );
  }

  if (city) {
    return (
      <div className="flex shrink-0 items-center rounded-lg border border-kap-purple/25 bg-kap-purple/10 text-[11px] font-semibold text-kap-purple">
        <button
          onClick={startEditing}
          title="Change city"
          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-kap-purple/10"
        >
          <MapPin className="size-3 shrink-0" />
          {city}
        </button>
        <button
          onClick={onClear}
          aria-label="Clear city"
          className="flex size-6 items-center justify-center border-l border-kap-purple/20 hover:bg-kap-purple/10"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      title="Set your delivery city"
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-kira-border px-2.5 py-1 text-[11px] font-medium text-kira-muted transition-colors hover:border-kap-purple/40 hover:text-kira-text-2"
    >
      <MapPin className="size-3 shrink-0" />
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
        className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-kap-purple/25 bg-kap-purple/10 px-2.5 py-1 text-[11px] font-semibold text-kap-purple transition-colors hover:bg-kap-purple/15"
      >
        <Calendar className="size-3 shrink-0 pointer-events-none" />
        <span className="pointer-events-none">{formatted}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label="Clear delivery date"
          className="ml-0.5 hover:opacity-60"
        >
          <X className="size-3" />
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
      className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-kira-border px-2.5 py-1 text-[11px] font-medium text-kira-muted transition-colors hover:border-kap-purple/40 hover:text-kira-text-2"
    >
      <Calendar className="size-3 shrink-0 pointer-events-none" />
      <span className="pointer-events-none">Delivery date</span>
      <input
        type="date"
        min={today}
        onChange={(e) => e.target.value && onSet(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-lg opacity-0"
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
    <div className="z-10 shrink-0 border-b border-kira-line bg-kira-paper">
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-4 py-2">
        <span className="hidden text-[10px] font-bold uppercase text-kira-muted sm:inline">
          Gift brief
        </span>
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
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            <Wallet className="size-3" />
            {budget}
          </div>
        )}
        {occasion && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800">
            <Sparkles className="size-3 shrink-0" />
            {occasion}
          </div>
        )}
        {recipient && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-kira-border bg-white px-2.5 py-1 text-[11px] font-semibold text-kira-text-2">
            <User className="size-3 shrink-0" />
            {recipient}
          </div>
        )}
      </div>
    </div>
  );
}
