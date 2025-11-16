-- Supabase schema for the Retento question generator
-- Run this in `psql` or the Supabase SQL editor as part of the initial setup.
create extension if not exists "uuid-ossp";

-- Table to track each Gemini-backed generation session.
create table if not exists public.generator_sessions (
  id uuid primary key default uuid_generate_v4(),
  status text not null default 'pending',
  parallel_slot int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  current_word text,
  progress_count int not null default 0,
  session_meta jsonb
);

-- Table to persist generated questions.
create table if not exists public.generated_questions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.generator_sessions(id) on delete cascade,
  word_id int,
  word text not null,
  pattern_number int not null,
  sentence_en text not null,
  sentence_ja text not null,
  choice_1 text not null,
  choice_2 text not null,
  choice_3 text not null,
  choice_4 text not null,
  correct_choice_index smallint not null,
  feedback_1 text not null,
  feedback_2 text not null,
  feedback_3 text not null,
  feedback_4 text not null,
  tags text not null,
  usage_scene text not null,
  embedding_text text not null,
  created_at timestamptz not null default now()
);

-- Table to store session logs/responses for auditing.
create table if not exists public.generation_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.generator_sessions(id) on delete set null,
  log_level text not null default 'info',
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
