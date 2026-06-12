"use client";

import type { ReactNode } from "react";

/**
 * Concentric corner radius — Apple's rule that nested rounded shapes share a
 * center: an inner element's radius is the outer radius minus the gap between
 * them. Keeps a glass card and the controls inside it visually "centred".
 */
export const concentric = (outerRadius: number, gap: number) =>
  Math.max(0, outerRadius - gap);

/**
 * Our web analog of SwiftUI's `GlassEffectContainer`. Wrapping a cluster of glass
 * shapes here runs them through the metaball #lg-goo filter, so shapes that come
 * close fuse and morph into one another (a dock item blooming, a tab bar
 * expanding) instead of hard cross-fading. Pair with a layout animation
 * (Framer Motion `layoutId`) on the children for the stretch between states.
 *
 * Experimental: the merge reads best on near-opaque glass clusters on a calm
 * backdrop. Off by default everywhere else — opt in per cluster.
 */
export default function GlassEffectContainer({
  children,
  className = "",
  merge = true,
}: {
  children: ReactNode;
  className?: string;
  /** Apply the metaball merge filter. */
  merge?: boolean;
}) {
  return (
    <div
      className={className}
      style={merge ? { filter: "url(#lg-goo)" } : undefined}
    >
      {children}
    </div>
  );
}
