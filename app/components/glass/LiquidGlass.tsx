"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * Edge-lensing displacement map. Unlike fractal noise (which just wobbles), this
 * is a rounded "bevel normal map": the Red channel ramps left→right and Green
 * ramps top→bottom, but each holds a flat neutral plateau (128) through the
 * middle — so feDisplacementMap bends the backdrop only at the rim and leaves the
 * center flat. That's the optical signature of Apple's Liquid Glass: a lens, not
 * a frost. Built channel-isolated via `screen` blend of a pure-red and pure-green
 * gradient over black, in objectBoundingBox units so one map fits any size.
 */
const BEVEL_MAP =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
      `<defs>` +
      `<linearGradient id="r" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0%" stop-color="#000"/><stop offset="34%" stop-color="#800000"/>` +
      `<stop offset="66%" stop-color="#800000"/><stop offset="100%" stop-color="#f00"/>` +
      `</linearGradient>` +
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="#000"/><stop offset="34%" stop-color="#008000"/>` +
      `<stop offset="66%" stop-color="#008000"/><stop offset="100%" stop-color="#0f0"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width="100" height="100" fill="url(#r)"/>` +
      `<rect width="100" height="100" fill="url(#g)" style="mix-blend-mode:screen"/>` +
      `</svg>`
  );

/**
 * SVG filters that back the glass. Mount ONCE per page (they live off-screen):
 *  - #lg-distortion — edge-lensing refraction, referenced by the `displace` prop.
 *    Firefox refracts the live backdrop fully; Chromium/Safari keep the frost and
 *    bend it faintly. Per-frame and expensive — reserve for hero/nav surfaces.
 *  - #lg-goo — metaball merge, used by <GlassEffectContainer> so adjacent glass
 *    blobs fuse and morph (our analog of SwiftUI's GlassEffectContainer).
 */
export function LiquidGlassFilters() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="lg-distortion"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={BEVEL_MAP}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="map"
          />
          <feGaussianBlur in="map" stdDeviation="0.5" result="smap" />
          {/* Chromatic dispersion: displace R/G/B by slightly different amounts so
              the refracted edge splits into a faint warm/cool fringe — what real
              glass does, and the subtle rainbow you see on Apple's rim. The
              channels separate only where the bend is steep (the edges). */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="smap"
            scale={47}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dR"
          />
          <feColorMatrix
            in="dR"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="cR"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="smap"
            scale={42}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dG"
          />
          <feColorMatrix
            in="dG"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="cG"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="smap"
            scale={37}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dB"
          />
          <feColorMatrix
            in="dB"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cB"
          />
          <feBlend in="cR" in2="cG" mode="screen" result="cRG" />
          <feBlend in="cRG" in2="cB" mode="screen" />
        </filter>

        <filter id="lg-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

/** Apple's two materials: Regular (adaptive, frosty, safe anywhere) and Clear
 * (more transparent, more refraction, needs a dim backdrop — gets a scrim). */
export type GlassVariant = "regular" | "clear";

type LiquidGlassOwnProps = {
  /** Render as a different element — e.g. "button" for an operable glass surface. */
  as?: ElementType;
  children?: ReactNode;
  /** Outer-box classes: sizing, positioning, margins, press feedback. */
  className?: string;
  /** Inner-layout classes for the content layer: padding, flex/grid, gap. */
  contentClassName?: string;
  /** Corner radius in px. Pass a large value (e.g. 999) for an Apple capsule. */
  radius?: number;
  /** Backdrop blur in px. Defaults by variant (regular ≈ 12, clear ≈ 3). */
  blur?: number;
  /** Apple's material variant. */
  variant?: GlassVariant;
  /** Optional CSS colour for the body tint (a brand wash — use sparingly). */
  tint?: string;
  /**
   * Edge magnification ring: a thin rim layer with its own backdrop-filter that
   * magnifies the very edge — the cheap, always-on half of Apple's lensing. On
   * by default; the heavier SVG `displace` refraction layers on top of it.
   */
  lens?: boolean;
  /** Apply the SVG edge-lensing refraction (#lg-distortion). Expensive; opt-in. */
  displace?: boolean;
  /** Bespalov frosted refraction — use on individual glass components only. */
  frosted?: boolean;
  /** Track the pointer with a moving specular highlight. */
  interactive?: boolean;
  /** Drift the specular highlight with scroll + device tilt — Apple's "reacts to
   * movement" gleam. Opt-in (adds listeners); use on hero/nav surfaces. */
  live?: boolean;
  style?: CSSProperties;
};

type LiquidGlassProps = LiquidGlassOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof LiquidGlassOwnProps>;

const FROST: Record<GlassVariant, (b: number) => string> = {
  regular: (b) => `blur(${b}px) saturate(180%) brightness(1.05)`,
  clear: (b) => `blur(${b}px) saturate(140%) brightness(1.08)`,
};

export default function LiquidGlass({
  as,
  children,
  className = "",
  contentClassName = "",
  radius = 28,
  blur,
  variant = "regular",
  tint,
  lens = true,
  displace = false,
  frosted = false,
  interactive = true,
  live = false,
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}: LiquidGlassProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const raf = useRef(0);
  const b = blur ?? (variant === "clear" ? 3 : 12);
  const frostBase = FROST[variant](b);
  const frost = frosted ? `url(#kira-frosted) ${frostBase}` : frostBase;

  const handleMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      onPointerMove?.(e as ReactPointerEvent<HTMLButtonElement>);
      if (!interactive) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--lg-px", `${x}%`);
        el.style.setProperty("--lg-py", `${y}%`);
        el.style.setProperty("--lg-spec", "1");
      });
    },
    [interactive, onPointerMove]
  );

  const handleLeave = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      onPointerLeave?.(e as ReactPointerEvent<HTMLButtonElement>);
      if (!interactive) return;
      const el = ref.current;
      if (!el) return;
      cancelAnimationFrame(raf.current);
      el.style.setProperty("--lg-spec", "0.4");
      el.style.setProperty("--lg-px", "50%");
      el.style.setProperty("--lg-py", "0%");
    },
    [interactive, onPointerLeave]
  );

  // Live specular: nudge the gleam as the page scrolls and the device tilts, so
  // the rim "reacts to movement" the way Apple's real-time material does.
  useEffect(() => {
    if (!live) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const t = 1 - Math.min(1, Math.max(0, r.top / window.innerHeight));
        el.style.setProperty("--lg-py", `${(t * 100).toFixed(1)}%`);
        el.style.setProperty("--lg-spec", "0.7");
      });
    };
    const onTilt = (ev: DeviceOrientationEvent) => {
      const g = Math.min(1, Math.max(0, ((ev.gamma ?? 0) + 45) / 90));
      el.style.setProperty("--lg-px", `${(g * 100).toFixed(1)}%`);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [live]);

  return (
    <Tag
      ref={ref}
      className={`lg-wrapper lg-${variant} ${className}`}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={
        {
          "--lg-radius": `${radius}px`,
          ...(tint ? { "--lg-tint": tint } : {}),
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <span
        className="lg-effect"
        style={{
          backdropFilter: frost,
          WebkitBackdropFilter: frost,
          filter: displace ? "url(#lg-distortion)" : undefined,
        }}
      />
      {lens && <span className="lg-edge" aria-hidden="true" />}
      <span className="lg-tint" />
      {variant === "clear" && <span className="lg-scrim" aria-hidden="true" />}
      <span className="lg-shine" />
      <span className={`lg-content ${contentClassName}`}>{children}</span>
    </Tag>
  );
}
