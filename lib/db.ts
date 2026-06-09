// ─────────────────────────────────────────────────────────────────────────
// FROZEN DB SEAM.
// This stub is replaced by the Codex backend prompt (docs/CODEX-BACKEND-PROMPT.md)
// with a real Neon Postgres (pg) implementation. KEEP THESE EXACT EXPORTS.
//
// Until a driver is wired, isDbConfigured() is false whenever DATABASE_URL is
// unset, so lib/catalog.ts transparently serves data/seed-catalog.json instead.
// lib/catalog.ts also wraps every DB call in try/catch and falls back to the
// seed, so even a half-configured DB can never break a page render.
// ─────────────────────────────────────────────────────────────────────────

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T = unknown>(
  _sql: string,
  _params: unknown[] = []
): Promise<T[]> {
  throw new Error(
    "lib/db.ts stub: no Postgres driver wired yet. Run docs/CODEX-BACKEND-PROMPT.md to enable Neon."
  );
}

export async function ensureSchema(): Promise<void> {
  throw new Error(
    "lib/db.ts stub: schema setup unavailable until the Neon driver is wired."
  );
}
