"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
};

const DIMS = {
  sm: { track: "h-6 w-10", knob: "size-5", on: "translate-x-4" },
  md: { track: "h-7 w-[52px]", knob: "size-6", on: "translate-x-[22px]" },
} as const;

/** iOS-style switch. Accent track when on, white knob slides with a spring ease. */
export default function GlassSwitch({
  checked,
  onChange,
  disabled,
  size = "md",
  ...aria
}: Props) {
  const d = DIMS[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...aria}
      className={`lg-press relative inline-flex items-center rounded-full p-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 disabled:opacity-40 ${d.track}`}
      style={{
        background: checked ? "rgba(139,134,255,0.62)" : "rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <span
        className={`${d.knob} rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-300 ${
          checked ? d.on : "translate-x-0"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </button>
  );
}
