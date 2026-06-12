"use client";

import type { ReactNode } from "react";
import LiquidGlass, { type GlassVariant } from "./LiquidGlass";

type Props = {
  eyebrow?: string;
  title?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  radius?: number;
  blur?: number;
  variant?: GlassVariant;
  displace?: boolean;
  live?: boolean;
  className?: string;
};

/** Structured glass panel: eyebrow + title + trailing, body, optional footer. */
export default function GlassCard({
  eyebrow,
  title,
  trailing,
  children,
  footer,
  radius = 24,
  blur,
  variant = "regular",
  displace,
  live,
  className = "",
}: Props) {
  const hasHeader = eyebrow || title || trailing;
  return (
    <LiquidGlass
      radius={radius}
      blur={blur}
      variant={variant}
      displace={displace}
      live={live}
      className={className}
      contentClassName="p-6"
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                {eyebrow}
              </p>
            )}
            {title && (
              <div className="mt-1 text-[19px] font-medium tracking-tight text-white">
                {title}
              </div>
            )}
          </div>
          {trailing && <div className="shrink-0 text-white/55">{trailing}</div>}
        </div>
      )}
      {children && (
        <div className="mt-3 text-[13px] leading-relaxed text-white/55">{children}</div>
      )}
      {footer && (
        <>
          <div className="lg-divider my-5" />
          <div>{footer}</div>
        </>
      )}
    </LiquidGlass>
  );
}
