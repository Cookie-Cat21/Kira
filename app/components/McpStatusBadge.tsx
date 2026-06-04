"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import type { McpStatusResponse } from "@/app/api/mcp-status/route";

const DOT: Record<string, string> = {
  up: "bg-emerald-400 shadow-[0_0_0_3px_rgb(52_211_153/0.2)]",
  degraded: "bg-amber-400 shadow-[0_0_0_3px_rgb(251_191_36/0.2)] animate-pulse",
  down: "bg-red-400 shadow-[0_0_0_3px_rgb(248_113_113/0.2)] animate-pulse",
  checking: "bg-white/20 animate-pulse",
};

const LABEL: Record<string, string> = {
  up: "MCP live",
  degraded: "MCP slow",
  down: "MCP down",
  checking: "Checking…",
};

const TEXT: Record<string, string> = {
  up: "text-emerald-400",
  degraded: "text-amber-400",
  down: "text-red-400",
  checking: "text-white/30",
};

const BANNER_BG: Record<string, string> = {
  up: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  degraded: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  down: "from-red-500/10 to-red-500/5 border-red-500/20",
  checking: "from-white/5 to-white/5 border-white/10",
};

const STATUS_COPY: Record<string, { title: string; sub: string }> = {
  up: {
    title: "Kapruka MCP is operational",
    sub: "All product, delivery, and order tools are responding normally.",
  },
  degraded: {
    title: "Kapruka MCP is slow",
    sub: "Connected but response time is above normal. Searches may take longer.",
  },
  down: {
    title: "Kapruka MCP is unreachable",
    sub: "Could not connect to mcp.kapruka.com. Product lookups will fail.",
  },
  checking: {
    title: "Checking Kapruka MCP…",
    sub: "Connecting to mcp.kapruka.com",
  },
};

export default function McpStatusBadge() {
  const [data, setData] = useState<McpStatusResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch("/api/mcp-status");
      const json: McpStatusResponse = await res.json();
      setData(json);
    } catch {
      setData({ status: "down", latencyMs: null, checkedAt: new Date().toISOString() });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { check(); }, []);

  function openPopover() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const POPOVER_W = 288; // w-72
      const centered = rect.left + rect.width / 2 - POPOVER_W / 2;
      setPopoverPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(centered, window.innerWidth - POPOVER_W - 8)),
      });
    }
    setOpen(true);
  }

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const key = checking ? "checking" : (data?.status ?? "checking");
  const copy = STATUS_COPY[key];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPopover()}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/5"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full shrink-0 ${DOT[key]}`} />
        <span className={TEXT[key]}>{LABEL[key]}</span>
        {data?.latencyMs != null && !checking && (
          <span className="text-white/25 font-mono">{data.latencyMs}ms</span>
        )}
      </button>

      {mounted && open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="MCP status details"
          className="w-72 rounded-2xl p-4 shadow-xl"
          style={{
            position: "fixed",
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 9999,
            background: "rgba(18, 10, 35, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className={`rounded-xl border bg-gradient-to-br p-3 mb-4 ${BANNER_BG[key]}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT[key]}`} aria-hidden="true" />
              <span className={`text-sm font-semibold ${TEXT[key]}`}>{copy.title}</span>
            </div>
            <p className="text-xs text-white/50 pl-4">{copy.sub}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatTile
              label="Response time"
              value={data?.latencyMs != null ? `${data.latencyMs}ms` : "—"}
              dim={data?.latencyMs != null && data.latencyMs > 2000}
            />
            <StatTile
              label="Last checked"
              value={data ? new Date(data.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
            />
            <StatTile label="Endpoint" value="mcp.kapruka.com" mono />
            <StatTile label="Protocol" value="StreamableHTTP" mono />
          </div>

          {data?.error && (
            <div
              className="rounded-lg px-3 py-2 mb-4 text-xs font-mono text-red-400 break-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              {data.error}
            </div>
          )}

          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white/60 transition-colors hover:text-white/90 hover:bg-white/5 disabled:opacity-40"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Recheck now"}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function StatTile({ label, value, mono, dim }: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">{label}</div>
      <div className={`text-xs font-semibold truncate ${mono ? "font-mono" : ""} ${dim ? "text-amber-400" : "text-white/80"}`}>{value}</div>
    </div>
  );
}
