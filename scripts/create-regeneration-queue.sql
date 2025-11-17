create extension if not exists "uuid-ossp";

create table if not exists public.regeneration_queue (
  id uuid primary key default uuid_generate_v4(),
  word_id int not null,
  word text not null,
  reason text,
  status text not null default 'pending',
  session_id uuid,
  last_error text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_regeneration_queue_status_word_id
  on public.regeneration_queue (status, word_id);
