"use client";

import { forwardRef, useRef } from "react";
import { Server, Sparkles, User } from "lucide-react";
import { AnimatedBeam } from "@/app/components/ui/animated-beam";
import { cn } from "@/lib/utils";

const Node = forwardRef<
  HTMLDivElement,
  { icon: React.ReactNode; label: string; active?: boolean }
>(function Node({ icon, label, active }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-10 flex flex-col items-center gap-1",
        active && "scale-105"
      )}
    >
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full border shadow-sm transition-colors sm:size-10",
          active
            ? "border-kap-purple/30 bg-kap-purple text-white"
            : "border-kira-border bg-white text-kap-purple"
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "max-w-[4.5rem] text-center text-[9px] font-semibold leading-tight sm:max-w-none sm:text-[10px]",
          active ? "text-kap-purple" : "text-kira-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
});

/** Visualizes the live path: you → Kira → Kapruka MCP */
export default function McpThinkingFlow({ activeStep }: { activeStep?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const youRef = useRef<HTMLDivElement>(null);
  const kiraRef = useRef<HTMLDivElement>(null);
  const mcpRef = useRef<HTMLDivElement>(null);

  const onMcp =
    activeStep?.toLowerCase().includes("kapruka") ||
    activeStep?.toLowerCase().includes("catalog") ||
    activeStep?.toLowerCase().includes("delivery") ||
    activeStep?.toLowerCase().includes("order");

  return (
    <div
      ref={containerRef}
      className="relative mb-3 flex w-full items-center justify-between rounded-xl border border-kira-border bg-kira-bg/80 px-3 py-3 sm:px-5"
      aria-label="Kira is calling Kapruka MCP"
    >
      <Node ref={youRef} icon={<User className="size-4" />} label="You" />
      <Node
        ref={kiraRef}
        icon={<Sparkles className="size-4" />}
        label="Kira"
        active={!onMcp}
      />
      <Node
        ref={mcpRef}
        icon={<Server className="size-4" />}
        label="Kapruka MCP"
        active={onMcp}
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={youRef}
        toRef={kiraRef}
        curvature={-20}
        gradientStartColor="#402970"
        gradientStopColor="#f8da08"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={kiraRef}
        toRef={mcpRef}
        curvature={20}
        delay={0.4}
        gradientStartColor="#402970"
        gradientStopColor="#f8da08"
      />
    </div>
  );
}
