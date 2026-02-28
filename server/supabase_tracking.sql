-- ════════════════════════════════════════════════════════════════════════
-- Gameplay tracking tables for analytics
-- Run this in the Supabase Dashboard SQL Editor
-- ════════════════════════════════════════════════════════════════════════

-- New games started
create table if not exists game_sessions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  language   text not null default 'en',
  created_at timestamptz not null default now()
);

create index idx_game_sessions_session on game_sessions (session_id);
create index idx_game_sessions_created on game_sessions (created_at);

-- Every chat turn between player and NPC
create table if not exists chat_events (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null,
  npc_id            text not null,
  player_message    text not null,
  npc_reply         text not null,
  tactic_type       text,
  evidence_strength text,
  pressure          int,
  rapport           int,
  pressure_band     text,
  rapport_band      text,
  expression        text,
  evidence_ids      jsonb default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create index idx_chat_events_session on chat_events (session_id);
create index idx_chat_events_npc     on chat_events (npc_id);
create index idx_chat_events_created on chat_events (created_at);

-- Evidence discoveries
create table if not exists discovery_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  evidence_id text not null,
  npc_id      text,
  created_at  timestamptz not null default now()
);

create index idx_discovery_events_session on discovery_events (session_id);
create index idx_discovery_events_created on discovery_events (created_at);

-- Accusation attempts
create table if not exists accusation_events (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  target_npc_id   text not null,
  correct         boolean not null,
  evidence_count  int,
  interview_count int,
  created_at      timestamptz not null default now()
);

create index idx_accusation_events_session on accusation_events (session_id);
create index idx_accusation_events_created on accusation_events (created_at);
