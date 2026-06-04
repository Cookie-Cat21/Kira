"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CreditCard, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardState {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
}

export interface CardValidity {
  number: boolean;
  name: boolean;
  expiry: boolean;
  cvc: boolean;
  allValid: boolean;
}

interface CreditCardFormProps {
  ring1?: string;
  ring2?: string;
  showSubmit?: boolean;
  className?: string;
  onChange?: (state: CardState, validity: CardValidity) => void;
  onSubmit?: (state: CardState, validity: CardValidity) => void;
}

const EMPTY_CARD: CardState = {
  number: "",
  name: "",
  expiry: "",
  cvc: "",
};

export function CreditCardForm({
  ring1 = "#402970",
  ring2 = "#f8da08",
  showSubmit = true,
  className,
  onChange,
  onSubmit,
}: CreditCardFormProps) {
  const [card, setCard] = useState<CardState>(EMPTY_CARD);

  const validity = useMemo(() => validateCard(card), [card]);
  const numberDigits = onlyDigits(card.number);
  const previewNumber = formatPreviewNumber(numberDigits);

  function updateField<K extends keyof CardState>(field: K, value: string) {
    const next = {
      ...card,
      [field]: field === "number" ? formatCardNumber(value) : value,
    };
    if (field === "expiry") next.expiry = formatExpiry(value);
    if (field === "cvc") next.cvc = onlyDigits(value).slice(0, 4);
    setCard(next);
    onChange?.(next, validateCard(next));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(card, validity);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("rounded-xl bg-white p-4", className)}
    >
      <div
        className="relative mb-4 overflow-hidden rounded-xl p-4 text-white shadow-lg"
        style={{
          background: `radial-gradient(circle at 15% 20%, ${ring2} 0, transparent 26%), linear-gradient(135deg, ${ring1}, #241832 70%)`,
        }}
      >
        <div className="mb-8 flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <CreditCard className="size-5" />
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase">
            <LockKeyhole className="size-3" />
            Secure
          </span>
        </div>
        <p className="font-mono text-lg tracking-[0.12em]">{previewNumber}</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-white/60">
              Cardholder
            </p>
            <p className="truncate text-sm font-semibold">
              {card.name || "Recipient payment"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase text-white/60">
              Expires
            </p>
            <p className="font-mono text-sm font-semibold">
              {card.expiry || "MM/YY"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <Field
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          value={card.number}
          onChange={(value) => updateField("number", value)}
          placeholder="4242 4242 4242 4242"
          valid={card.number.length === 0 || validity.number}
        />
        <Field
          label="Name on card"
          autoComplete="cc-name"
          value={card.name}
          onChange={(value) => updateField("name", value)}
          placeholder="Amali Perera"
          valid={card.name.length === 0 || validity.name}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={card.expiry}
            onChange={(value) => updateField("expiry", value)}
            placeholder="MM/YY"
            valid={card.expiry.length === 0 || validity.expiry}
          />
          <Field
            label="CVC"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={card.cvc}
            onChange={(value) => updateField("cvc", value)}
            placeholder="123"
            valid={card.cvc.length === 0 || validity.cvc}
          />
        </div>
      </div>

      {showSubmit && (
        <button
          type="submit"
          disabled={!validity.allValid}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-kap-purple px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-kap-purple/90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ opacity: validity.allValid ? 1 : 0.6 }}
        >
          Submit payment
        </button>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  placeholder,
  valid,
  onChange,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  placeholder: string;
  valid: boolean;
  onChange: (value: string) => void;
  inputMode?: "numeric" | "text";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase text-kira-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={cn(
          "h-11 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-kira-text outline-none transition-all placeholder:text-kira-muted",
          valid
            ? "border-kira-line focus:border-kap-purple/60 focus:ring-2 focus:ring-kap-purple/10"
            : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        )}
      />
    </label>
  );
}

function validateCard(card: CardState): CardValidity {
  const number = isValidCardNumber(card.number);
  const name = card.name.trim().length >= 2;
  const expiry = isValidExpiry(card.expiry);
  const cvc = /^\d{3,4}$/.test(card.cvc);

  return {
    number,
    name,
    expiry,
    cvc,
    allValid: number && name && expiry && cvc,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return onlyDigits(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatPreviewNumber(value: string) {
  return Array.from({ length: 16 }, (_, index) => value[index] ?? "-")
    .join("")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidCardNumber(value: string) {
  const digits = onlyDigits(value);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isValidExpiry(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiresAt = new Date(year, month, 0, 23, 59, 59);
  return expiresAt >= now;
}
