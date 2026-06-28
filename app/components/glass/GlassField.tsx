"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import LiquidGlass from "./LiquidGlass";

type Props = {
  label?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"input">;

/** Frosted input. The whole surface lights its rim on focus-within. */
export default function GlassField({
  label,
  icon,
  trailing,
  className = "",
  id,
  ...input
}: Props) {
  const auto = useId();
  const fieldId = id ?? auto;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-[11px] uppercase tracking-[0.22em] text-white/40"
        >
          {label}
        </label>
      )}
      <LiquidGlass
        radius={14}
        blur={8}
        interactive={false}
        className="block transition focus-within:ring-2 focus-within:ring-white/45"
        contentClassName="flex h-12 items-center gap-2.5 px-4"
      >
        {icon && <span className="shrink-0 text-white/40">{icon}</span>}
        <input
          id={fieldId}
          {...input}
          className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </LiquidGlass>
    </div>
  );
}
