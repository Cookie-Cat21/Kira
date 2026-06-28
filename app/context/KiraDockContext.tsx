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
  seed: KiraDockSeed | null;
  open: (seed?: KiraDockSeed) => void;
  close: () => void;
  toggle: () => void;
}

const KiraDockContext = createContext<KiraDockValue | null>(null);

export function useKiraDock(): KiraDockValue {
  const ctx = useContext(KiraDockContext);
  if (!ctx) throw new Error("useKiraDock must be used within KiraDockProvider");
  return ctx;
}

export function KiraDockProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [seed, setSeed] = useState<KiraDockSeed | null>(null);
  const open = useCallback((nextSeed?: KiraDockSeed) => {
    setSeed(nextSeed ?? null);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setSeed(null);
  }, []);
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (v) setSeed(null);
      return !v;
    });
  }, []);

  const value = useMemo(
    () => ({ isOpen, seed, open, close, toggle }),
    [isOpen, seed, open, close, toggle]
  );

  return (
    <KiraDockContext.Provider value={value}>
      {children}
    </KiraDockContext.Provider>
  );
}
