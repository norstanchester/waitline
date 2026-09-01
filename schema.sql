create extension if not exists "uuid-ossp";

create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  avg_service_minutes int not null default 10,
  admin_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

create table if not exists queue_entries (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  party_size int not null default 1,
  status text not null default 'waiting' check (status in ('waiting', 'called', 'served', 'cancelled')),
  created_at timestamptz not null default now()
);