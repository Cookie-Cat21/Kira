"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { KiraProduct } from "@/types";

// Optional opening context for the dock — e.g. "Ask Kira about this" on a
// product page seeds the chat with a prompt (and the product, so Kira's
// lastProducts follow-ups like "add it to my cart" work).
export interface KiraDockSeed {
  prompt: string;
  product?: KiraProduct;
}

interface KiraDockValue {
  isOpen: boolean;
  /** True when the dock has expanded to full viewport (from floating glass). */
  isExpanded: boolean;
  seed: KiraDockSeed | null;
  /** True while Kira is processing a response (tool calls / streaming). */
  isThinking: boolean;
  open: (seed?: KiraDockSeed) => void;
  close: () => void;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  setThinking: (thinking: boolean) => void;
}

const KiraDockContext = createContext<KiraDockValue | null>(null);

export function useKiraDock(): KiraDockValue {
  const ctx = useContext(KiraDockContext);
  if (!ctx) throw new Error("useKiraDock must be used within KiraDockProvider");
  return ctx;
}

export function KiraDockProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [seed, setSeed] = useState<KiraDockSeed | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const open = useCallback((nextSeed?: KiraDockSeed) => {
    setSeed(nextSeed ?? null);
    setIsExpanded(false);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
    setSeed(null);
  }, []);
  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (v) setSeed(null);
      return !v;
    });
  }, []);
  const setThinking = useCallback((thinking: boolean) => {
    setIsThinking(thinking);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      isExpanded,
      seed,
      isThinking,
      open,
      close,
      toggle,
      expand,
      collapse,
      setThinking,
    }),
    [isOpen, isExpanded, seed, isThinking, open, close, toggle, expand, collapse, setThinking]
  );

  return (
    <KiraDockContext.Provider value={value}>
      {children}
    </KiraDockContext.Provider>
  );
}
