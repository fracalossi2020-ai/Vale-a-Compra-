create extension if not exists pgcrypto;

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

create index if not exists price_alerts_active_idx on price_alerts (active, created_at);
create unique index if not exists price_alerts_unique_active_idx on price_alerts (lower(email), product_url) where active = true;
