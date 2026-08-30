import { Pool } from "pg";

let pool: Pool | undefined;

export function database() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return undefined;
  pool ??= new Pool({ connectionString, max: 5 });
  return pool;
}

let schemaReady: Promise<void> | undefined;

export function ensureCoreSchema() {
  const pool = database();
  if (!pool) return Promise.resolve();
  schemaReady ??= pool.query(`
    create table if not exists marketplace_credentials (
      marketplace varchar(50) primary key,
      access_token text not null,
      refresh_token text,
      expires_at timestamptz not null,
      updated_at timestamptz not null default now()
    );
    create table if not exists analyses (
      id uuid primary key default gen_random_uuid(),
      product_url text not null,
      marketplace varchar(50) not null,
      product_external_id varchar(100),
      score numeric(3,1),
      verdict varchar(30),
      snapshot jsonb not null,
      created_at timestamptz not null default now()
    );
    create table if not exists price_alerts (
      id uuid primary key default gen_random_uuid(),
      email varchar(320) not null,
      product_url text not null,
      target_price numeric(12,2),
      active boolean not null default true,
      last_notified_at timestamptz,
      created_at timestamptz not null default now()
    );
  `).then(() => undefined);
  return schemaReady;
}
