-- Migration: ware_media Tabelle erstellen
-- Datei-Anhänge für "Ware in China" Einträge

create table if not exists ware_media (
  id           uuid primary key default gen_random_uuid(),
  ware_id      uuid not null references ware_in_china(id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  media_type   text not null default 'image',
  uploaded_by  text not null,
  created_at   timestamptz default now()
);

create index if not exists idx_ware_media_ware_id on ware_media(ware_id);

alter table ware_media enable row level security;

create policy "Authenticated users can read ware_media" on ware_media
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert ware_media" on ware_media
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete ware_media" on ware_media
  for delete using (auth.role() = 'authenticated');
