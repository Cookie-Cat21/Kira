"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface KiraDockValue {
  isOpen: boolean;
  open: () => void;
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
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return (
    <KiraDockContext.Provider value={value}>
      {children}
    </KiraDockContext.Provider>
  );
}
