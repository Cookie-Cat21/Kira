"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Calendar, X, Sparkles, User, Wallet, ShoppingBag } from "lucide-react";
import type { ComponentType } from "react";

export interface CommerceContext {
  city?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
}

type ChipIcon = ComponentType<{ className?: string }>;

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
      <div className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1" style={{ background: "rgba(64,41,112,0.4)", border: "1px solid rgba(148,100,255,0.5)" }}>
        <MapPin className="size-3 shrink-0 text-purple-300" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="w-20 bg-transparent text-[11px] font-medium text-white/90 outline-none placeholder:text-white/30"
          placeholder="e.g. Colombo"
        />
      </div>
    );
  }

  if (city) {
    return (
      <div className="flex shrink-0 items-center rounded-lg text-[11px] font-semibold" style={{ background: "rgba(64,41,112,0.35)", color: "rgba(196,181,253,0.9)", border: "1px solid rgba(148,100,255,0.3)" }}>
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
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-white/70"
      style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}
    >
      <MapPin className="size-3 shrink-0" />
      <span>Your city</span>
    </button>
  );
}

// ── Generic editable text chip ────────────────────────────────────────────────

function TextChip({
  icon: Icon,
  value,
  placeholder,
  title,
  onSet,
  onClear,
  tone = "purple",
}: {
  icon: ChipIcon;
  value?: string;
  placeholder: string;
  title: string;
  onSet: (v: string) => void;
  onClear: () => void;
  tone?: "purple" | "yellow" | "white";
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

  const styles =
    tone === "yellow"
      ? {
          full: "rgba(248,218,8,0.12)",
          text: "rgba(248,218,8,0.85)",
          border: "rgba(248,218,8,0.2)",
        }
      : tone === "white"
      ? {
          full: "rgba(255,255,255,0.07)",
          text: "rgba(255,255,255,0.65)",
          border: "rgba(255,255,255,0.1)",
        }
      : {
          full: "rgba(167,139,250,0.12)",
          text: "rgba(196,181,253,0.9)",
          border: "rgba(167,139,250,0.2)",
        };

  function startEditing() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next) onSet(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1"
        style={{ background: styles.full, border: `1px solid ${styles.border}` }}
      >
        <Icon className="size-3 shrink-0" style={{ color: styles.text }} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="w-28 bg-transparent text-[11px] font-medium text-white/90 outline-none placeholder:text-white/30"
          placeholder={placeholder}
        />
      </div>
    );
  }

  if (value) {
    return (
      <div
        className="flex shrink-0 items-center rounded-lg text-[11px] font-semibold"
        style={{ background: styles.full, color: styles.text, border: `1px solid ${styles.border}` }}
      >
        <button
          onClick={startEditing}
          title={title}
          className="flex max-w-[11rem] items-center gap-1.5 truncate px-2.5 py-1 hover:bg-white/5"
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{value}</span>
        </button>
        <button
          onClick={onClear}
          aria-label={`Clear ${placeholder}`}
          className="flex size-6 items-center justify-center border-l border-white/10 hover:bg-white/5"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      title={title}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-white/70"
      style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}
    >
      <Icon className="size-3 shrink-0" />
      <span>{placeholder}</span>
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
        className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
        style={{ background: "rgba(64,41,112,0.35)", color: "rgba(196,181,253,0.9)", border: "1px solid rgba(148,100,255,0.3)" }}
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
      className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-white/70"
      style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}
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
  cartCount?: number;
  cartTotal?: number;
  onOpenCart?: () => void;
}

const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export default function CommerceRail({
  context,
  onChange,
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
}: CommerceRailProps) {
  const { city, deliveryDate, budget, occasion, recipient } = context;

  return (
    <div className="glass-rail z-10 shrink-0">
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-4 py-2">
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-white/30 sm:inline">
          Gift Brief
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

        <TextChip
          icon={Wallet}
          value={budget}
          placeholder="Budget"
          title="Set budget"
          tone="yellow"
          onSet={(v) => onChange({ budget: v })}
          onClear={() => onChange({ budget: undefined })}
        />
        <TextChip
          icon={Sparkles}
          value={occasion}
          placeholder="Occasion"
          title="Set occasion"
          onSet={(v) => onChange({ occasion: v })}
          onClear={() => onChange({ occasion: undefined })}
        />
        <TextChip
          icon={User}
          value={recipient}
          placeholder="Recipient"
          title="Set recipient"
          tone="white"
          onSet={(v) => onChange({ recipient: v })}
          onClear={() => onChange({ recipient: undefined })}
        />
        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            title="Open gift tray"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors hover:text-white"
            style={{
              background: cartCount > 0 ? "rgba(248,218,8,0.12)" : "rgba(255,255,255,0.05)",
              color: cartCount > 0 ? "rgba(248,218,8,0.85)" : "rgba(255,255,255,0.42)",
              border: cartCount > 0 ? "1px solid rgba(248,218,8,0.2)" : "1px dashed rgba(255,255,255,0.15)",
            }}
          >
            <ShoppingBag className="size-3 shrink-0" />
            {cartCount > 0
              ? `${cartCount} · ${lkrFormatter.format(cartTotal)}`
              : "Tray"}
          </button>
        )}
      </div>
    </div>
  );
}
