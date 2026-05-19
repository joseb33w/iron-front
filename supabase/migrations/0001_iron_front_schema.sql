-- Iron Front — initial schema migration.
-- The same SQL that has already been applied to the live shared
-- Supabase project. Tables are user-prefixed (usr_nmexs7bytxq2_*)
-- per Gogi's shared-project architecture; one app per prefix.
--
-- See ../README.md and supabase/functions/README.md for context.
-- Apply with: psql "$DATABASE_URL" -f 0001_iron_front_schema.sql
--             OR Supabase Management API POST /v1/projects/{ref}/database/query.

create extension if not exists "pgcrypto";

do $$ begin
  create type usr_nmexs7bytxq2_biome as enum (
    'ruined_city', 'trench_network', 'scorched_farmland',
    'industrial_yard', 'frozen_north', 'muddy_lowland'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type usr_nmexs7bytxq2_rank as enum (
    'Recruit', 'Sergeant', 'Major', 'General'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.usr_nmexs7bytxq2_factions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  color text not null,
  capital_sector_id int not null,
  current_territory jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usr_nmexs7bytxq2_sectors (
  id uuid primary key default gen_random_uuid(),
  position_index int not null unique check (position_index between 0 and 49),
  name text not null,
  owner_faction_id uuid references public.usr_nmexs7bytxq2_factions(id),
  contested boolean not null default false,
  biome usr_nmexs7bytxq2_biome not null,
  last_battle_at timestamptz,
  battles_won_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.usr_nmexs7bytxq2_players (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id text not null,
  callsign text not null unique,
  faction_id uuid references public.usr_nmexs7bytxq2_factions(id),
  kills int not null default 0,
  deaths int not null default 0,
  cruisers_destroyed int not null default 0,
  rank usr_nmexs7bytxq2_rank not null default 'Recruit',
  medals jsonb not null default '[]'::jsonb,
  loyalty_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.usr_nmexs7bytxq2_battles (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  sector_id uuid not null references public.usr_nmexs7bytxq2_sectors(id),
  attacking_faction_id uuid references public.usr_nmexs7bytxq2_factions(id),
  defending_faction_id uuid references public.usr_nmexs7bytxq2_factions(id),
  winning_faction_id uuid references public.usr_nmexs7bytxq2_factions(id),
  participants jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  resolved boolean not null default false
);

-- RLS and grants follow the same pattern documented in src/lib/supabase.ts.
-- See the README for the full policies.

-- For brevity this migration omits the SECURITY DEFINER function bodies
-- and the cron registration — those live in supabase/functions/README.md
-- and were applied to the live project at provisioning time.
