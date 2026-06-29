"use client";

import type { ReactNode } from "react";
import LiquidGlass from "./LiquidGlass";

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  frosted?: boolean;
  urgent?: boolean;
};

/** Frosted pill — quick replies, tags, filters. Accent wash when active. */
export default function GlassChip({
  children,
  icon,
  active = false,
  onClick,
  title,
  className = "",
  frosted = false,
  urgent = false,
}: Props) {
  return (
    <LiquidGlass
      as="button"
      type="button"
      radius={999}
      blur={8}
      frosted={frosted}
      interactive={false}
      title={title}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      tint={
        active
          ? "rgba(139,134,255,0.22)"
          : urgent
            ? "rgba(248,218,8,0.12)"
            : undefined
      }
      className={`lg-press text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
        urgent
          ? "text-[rgba(255,210,80,0.95)]"
          : active
            ? "text-white"
            : "text-white/65 hover:text-white"
      } ${className}`}
      contentClassName="inline-flex items-center gap-1.5 px-3.5 py-1.5"
    >
      {icon}
      {children}
    </LiquidGlass>
  );
}
