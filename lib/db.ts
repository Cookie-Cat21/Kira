import "server-only";

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

type QueryResult<T> = { rows: T[] };
type PoolLike = {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
};
type PoolCtor = new (config: {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
}) => PoolLike;

const require = createRequire(path.join(process.cwd(), "package.json"));
const { Pool } = require("pg") as { Pool: PoolCtor };

type DbGlobal = typeof globalThis & {
  __kiraPool?: PoolLike;
};

function getPool(): PoolLike {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const globalRef = globalThis as DbGlobal;
  if (!globalRef.__kiraPool) {
    globalRef.__kiraPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  return globalRef.__kiraPool;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = getPool();
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

export async function ensureSchema(): Promise<void> {
  if (!isDbConfigured()) return;

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  const pool = getPool();
  await pool.query(schemaSql);
}
