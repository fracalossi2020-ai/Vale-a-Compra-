import { Pool } from "pg";

let pool: Pool | undefined;

export function database() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return undefined;
  pool ??= new Pool({ connectionString, max: 5 });
  return pool;
}
