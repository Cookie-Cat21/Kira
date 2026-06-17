"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import LiquidGlass from "./LiquidGlass";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type Props = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
} & ComponentPropsWithoutRef<"button">;

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[14px] gap-2",
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55";

/**
 * Three weights for the same shape:
 *  - primary   — solid white CTA (the one thing you want pressed)
 *  - secondary — frosted glass
 *  - ghost     — hairline outline, fills on hover
 */
export default function GlassButton({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  const base = `lg-press inline-flex items-center justify-center font-medium transition disabled:opacity-40 disabled:pointer-events-none ${SIZES[size]} ${FOCUS}`;
  // Apple controls are capsules — fully rounded regardless of size.
  const radius = 999;

  if (variant === "primary") {
    return (
      <button
        type={type}
        style={{ borderRadius: radius }}
        className={`${base} bg-white text-[#16121f] shadow-[0_2px_12px_rgba(0,0,0,0.25)] hover:bg-white/90 ${className}`}
        {...rest}
      >
        {icon}
        {children}
        {iconRight}
      </button>
    );
  }

  if (variant === "ghost") {
    return (
      <button
        type={type}
        style={{ borderRadius: radius }}
        className={`${base} border border-white/[0.12] text-white/70 hover:bg-white/[0.06] hover:text-white ${className}`}
        {...rest}
      >
        {icon}
        {children}
        {iconRight}
      </button>
    );
  }

  return (
    <LiquidGlass
      as="button"
      type={type}
      radius={radius}
      blur={8}
      className={`${base} text-white/85 hover:text-white ${className}`}
      contentClassName="inline-flex items-center justify-center gap-2"
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </LiquidGlass>
  );
}
