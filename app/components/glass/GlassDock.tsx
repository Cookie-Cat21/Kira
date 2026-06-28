"use client";

import type { ReactNode } from "react";
import LiquidGlass from "./LiquidGlass";

type DockItem = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
};

type Props = {
  items: DockItem[];
  className?: string;
};

/** Slim icon dock. Items lift and brighten on hover. */
export default function GlassDock({ items, className = "" }: Props) {
  return (
    <LiquidGlass
      radius={18}
      blur={18}
      className={className}
      contentClassName="flex items-center gap-1 p-1.5"
    >
      {items.map(({ label, icon, onClick, active }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={`lg-press grid size-11 place-items-center rounded-[13px] transition-all hover:-translate-y-0.5 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
            active ? "bg-white/[0.10] text-white" : "text-white/55 hover:text-white"
          }`}
        >
          {icon}
        </button>
      ))}
    </LiquidGlass>
  );
}
