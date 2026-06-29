"use client";

import { useState } from "react";
import KiraOrb from "@/app/components/KiraOrb";
import SiriWave from "@/app/components/ui/siri-wave";

export default function KiraOrbDemoPage() {
  const [thinking, setThinking] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-[#0a0a0c] p-8">
      <div className="text-center">
        <h1 className="font-display text-2xl text-white">Kira orb preview</h1>
        <p className="mt-2 text-sm text-white/50">
          Toggle thinking to crossfade wave ↔ fluid dots
        </p>
      </div>

      <button
        type="button"
        onClick={() => setThinking((v) => !v)}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0a0612]/90 p-1.5 pl-1.5 pr-5 shadow-[0_8px_32px_rgba(64,41,112,0.55)]"
      >
        <span className="relative flex size-[52px] items-center justify-center">
          <span
            className={
              thinking
                ? "kira-ring absolute inset-0 rounded-full bg-kap-yellow/25"
                : "kira-ring absolute inset-0 rounded-full bg-white/20 opacity-70"
            }
          />
          <KiraOrb thinking={thinking} size={52} />
        </span>
        <span className="text-sm font-semibold text-white/95">
          {thinking ? "Kira is thinking…" : "Ask Kira"}
        </span>
      </button>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Wave</p>
          <SiriWave variant="wave" size={280} className="rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)]" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Fluid dots</p>
          <SiriWave
            variant="fluid-dots"
            size={280}
            className="rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>
    </div>
  );
}
