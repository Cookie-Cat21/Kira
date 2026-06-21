"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { KiraProduct } from "@/types";

/** Opening context when launching Kira from the store (prompt + optional product). */
export interface KiraDockSeed {
  prompt: string;
  product?: KiraProduct;
}

interface KiraDockValue {
  seed: KiraDockSeed | null;
  open: (seed?: KiraDockSeed) => void;
  clearSeed: () => void;
}

const KiraDockContext = createContext<KiraDockValue | null>(null);

export function useKiraDock(): KiraDockValue {
  const ctx = useContext(KiraDockContext);
  if (!ctx) throw new Error("useKiraDock must be used within KiraDockProvider");
  return ctx;
}

export function KiraDockProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [seed, setSeed] = useState<KiraDockSeed | null>(null);

  const open = useCallback(
    (nextSeed?: KiraDockSeed) => {
      setSeed(nextSeed ?? null);
      router.push("/");
    },
    [router]
  );

  const clearSeed = useCallback(() => setSeed(null), []);

  const value = useMemo(
    () => ({ seed, open, clearSeed }),
    [seed, open, clearSeed]
  );

  return (
    <KiraDockContext.Provider value={value}>{children}</KiraDockContext.Provider>
  );
}
