"use client";

type Option = { label: string; value: string };

type Props = {
  options: (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

/**
 * Equal-width segmented control with a single white indicator that slides
 * between options. Grid columns keep the segments aligned regardless of label
 * length, so the indicator math stays simple (translateX by whole segments).
 */
export default function GlassSegmented({
  options,
  value,
  onChange,
  size = "md",
  className = "",
  ...aria
}: Props) {
  const opts = options.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
  const n = opts.length;
  const index = Math.max(
    0,
    opts.findIndex((o) => o.value === value)
  );
  const pad = size === "sm" ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]";

  return (
    <div
      role="tablist"
      {...aria}
      className={`relative inline-grid rounded-full bg-white/[0.05] p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 top-0.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-300"
        style={{
          left: "0.125rem",
          width: `calc((100% - 0.25rem) / ${n})`,
          transform: `translateX(${index * 100}%)`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {opts.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`lg-press relative z-10 rounded-full font-medium transition-colors ${pad} ${
              active ? "text-[#16121f]" : "text-white/55 hover:text-white/80"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
