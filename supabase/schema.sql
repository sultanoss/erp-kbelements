-- KB Portal — Retouren-Management Schema
-- Ausführen im Supabase SQL Editor

-- SKUs (manuell gepflegt)
create table if not exists skus (
  id      uuid primary key default gen_random_uuid(),
  sku     text not null unique,
  name    text,
  active  boolean default true,
  created_at timestamptz default now()
);

-- Retouren (Haupttabelle)
create table if not exists returns (
  id               uuid primary key default gen_random_uuid(),
  received_at      timestamptz default now(),
  received_by      text not null,
  order_number     text,
  description      text,
  status           text not null default 'eingegangen'
                   check (status in ('eingegangen', 'in_bearbeitung', 'erledigt')),
  resolution       text
                   check (resolution in ('neu', 'ns', 'garantie', 'bware') or resolution is null),
  resolved_at      timestamptz,
  resolved_by      text,
  resolution_notes text,
  tracking_number  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- SKUs pro Retoure (eine Retoure kann mehrere SKUs haben)
create table if not exists return_items (
  id         uuid primary key default gen_random_uuid(),
  return_id  uuid not null references returns(id) on delete cascade,
  sku        text not null,
  quantity   integer default 1 check (quantity > 0),
  is_manual  boolean default false,
  created_at timestamptz default now()
);

-- Verlauf / Audit-Trail (unveränderbar)
create table if not exists return_events (
  id          uuid primary key default gen_random_uuid(),
  return_id   uuid not null references returns(id) on delete cascade,
  event_type  text not null,
  note        text,
  author      text not null,
  created_at  timestamptz default now()
);

-- Indizes für Performance
create index if not exists idx_returns_status on returns(status);
create index if not exists idx_returns_created_at on returns(created_at desc);
create index if not exists idx_return_items_return_id on return_items(return_id);
create index if not exists idx_return_events_return_id on return_events(return_id);

-- RLS aktivieren (Row Level Security — nur angemeldete Nutzer)
alter table skus enable row level security;
alter table returns enable row level security;
alter table return_items enable row level security;
alter table return_events enable row level security;

-- Policies: alle angemeldeten Nutzer dürfen alles lesen/schreiben
create policy "Authenticated users can read skus" on skus
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert skus" on skus
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update skus" on skus
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete skus" on skus
  for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can read returns" on returns
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert returns" on returns
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update returns" on returns
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read return_items" on return_items
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert return_items" on return_items
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can read return_events" on return_events
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert return_events" on return_events
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- Todo: Terminkalender + Notizen
-- Im Supabase SQL Editor ausführen
-- ============================================================

create table if not exists kalender_eintraege (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  description text,
  reminder_at timestamptz,
  reminder_sent boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table kalender_eintraege enable row level security;
create policy "own rows only" on kalender_eintraege
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists notizen (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notizen enable row level security;
create policy "own rows only" on notizen
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User Settings (ntfy topic per user)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ntfy_topic text,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "own row only" on user_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
