import type { LastOrder } from "@/types";

const LAST_ORDER_KEY = "kira_last_order";

export function persistLastOrder(order: LastOrder): void {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* quota / private mode */
  }
}

export function loadPersistedLastOrder(): LastOrder | undefined {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return readFromLegacySession();
    const parsed = JSON.parse(raw) as LastOrder;
    if (!parsed?.items?.length) return undefined;
    return parsed;
  } catch {
    return readFromLegacySession();
  }
}

function readFromLegacySession(): LastOrder | undefined {
  try {
    const raw =
      localStorage.getItem("kira_session_v2") ??
      localStorage.getItem("kira_session_v1");
    if (!raw) return undefined;
    const session = JSON.parse(raw) as { lastOrder?: LastOrder };
    return session.lastOrder?.items?.length ? session.lastOrder : undefined;
  } catch {
    return undefined;
  }
}
