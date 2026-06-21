"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Calendar, X, Sparkles, User, Wallet, ShoppingBag } from "lucide-react";
import type { ComponentType } from "react";
import { getColomboTodayIso } from "@/lib/colombo-date";
import { cn } from "@/lib/utils";

export interface CommerceContext {
  city?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
}

type ChipIcon = ComponentType<{ className?: string }>;

const ghostChip =
  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-kira-border px-2.5 text-[11px] font-medium text-kira-muted transition-colors hover:text-kira-text-2";

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
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-kap-purple/30 bg-kap-purple/5 px-2.5 py-1">
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
          className="w-20 bg-transparent text-[11px] font-medium text-kira-text outline-none placeholder:text-kira-muted focus-visible:ring-0"
          placeholder="e.g. Colombo"
        />
      </div>
    );
  }

  if (city) {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-kap-purple/20 bg-kap-purple/5 text-[13px] font-semibold text-kap-purple">
        <button
          onClick={startEditing}
          title="Change city"
          className="flex min-h-11 items-center gap-1.5 px-3 hover:bg-kap-purple/10"
        >
          <MapPin className="size-3.5 shrink-0" />
          {city}
        </button>
        <button
          onClick={onClear}
          aria-label="Clear city"
          className="flex size-11 items-center justify-center border-l border-kap-purple/20 hover:bg-kap-purple/10"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startEditing} title="Set your delivery city" className={ghostChip}>
      <MapPin className="size-3 shrink-0" />
      <span>Your city</span>
    </button>
  );
}

const toneClasses = {
  purple: {
    filled: "border-kap-purple/20 bg-kap-purple/5 text-kap-purple",
    editing: "border-kap-purple/30 bg-kap-purple/5 text-kira-text",
    icon: "text-kap-purple",
    clearBorder: "border-kap-purple/20",
  },
  yellow: {
    filled: "border-kap-yellow/30 bg-kap-yellow/10 text-amber-900",
    editing: "border-kap-yellow/40 bg-kap-yellow/10 text-kira-text",
    icon: "text-amber-700",
    clearBorder: "border-kap-yellow/30",
  },
  neutral: {
    filled: "border-kira-border bg-kira-bg text-kira-text",
    editing: "border-kira-border bg-kira-bg text-kira-text",
    icon: "text-kira-muted",
    clearBorder: "border-kira-border",
  },
} as const;

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
  tone?: keyof typeof toneClasses;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const styles = toneClasses[tone];

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

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
      <div className={cn("flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1", styles.editing)}>
        <Icon className={cn("size-3 shrink-0", styles.icon)} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="w-28 bg-transparent text-[11px] font-medium text-kira-text outline-none placeholder:text-kira-muted"
          placeholder={placeholder}
        />
      </div>
    );
  }

  if (value) {
    return (
      <div className={cn("flex shrink-0 items-center rounded-lg border text-[11px] font-semibold", styles.filled)}>
        <button
          onClick={startEditing}
          title={title}
          className="flex max-w-[11rem] min-h-11 items-center gap-1.5 truncate px-2.5 hover:bg-black/[0.03]"
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{value}</span>
        </button>
        <button
          onClick={onClear}
          aria-label={`Clear ${placeholder}`}
          className={cn("flex size-11 items-center justify-center border-l hover:bg-black/[0.03]", styles.clearBorder)}
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startEditing} title={title} className={ghostChip}>
      <Icon className="size-3 shrink-0" />
      <span>{placeholder}</span>
    </button>
  );
}

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
  const today = getColomboTodayIso();

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
        className="relative flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-kap-purple/20 bg-kap-purple/5 px-2.5 text-[11px] font-semibold text-kap-purple transition-colors hover:bg-kap-purple/10"
      >
        <Calendar className="size-3 shrink-0 pointer-events-none" />
        <span className="pointer-events-none">{formatted}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="Clear delivery date"
          className="ml-0.5 flex size-8 items-center justify-center rounded-md hover:bg-kap-purple/10"
        >
          <X className="size-3" />
        </button>
        <input
          ref={hiddenInputRef}
          type="date"
          min={today}
          value={deliveryDate}
          onChange={(e) => e.target.value && onSet(e.target.value)}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
          readOnly={false}
        />
      </div>
    );
  }

  return (
    <label title="Set delivery date" className={cn(ghostChip, "relative cursor-pointer")}>
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
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-kira-muted sm:inline">
          Context
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
          tone="neutral"
          onSet={(v) => onChange({ recipient: v })}
          onClear={() => onChange({ recipient: undefined })}
        />
        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            title="Open gift tray"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-kira-border bg-kira-bg px-3 text-[13px] font-semibold text-kira-text transition-colors hover:bg-white"
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
