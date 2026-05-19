-- Iron Front — perf indexes for enlist + warmap + leaderboard hot paths.
-- Applied to the live shared Supabase project in PR #2.
-- See README "Enlist speed" and the PR body for the full diagnosis.

-- Players: lookups by faction (territory %, faction leaderboards, RLS on
-- faction-scoped queries). Without this, faction-filtered selects do a
-- seqscan of the whole players table, which is fine at 1 player but
-- gets worse as the global player count grows.
create index if not exists idx_usr_nmexs7bytxq2_players_faction_id
  on public.usr_nmexs7bytxq2_players (faction_id);

-- Players: lookups by Firebase user_id (the text column). The id PK
-- already covers auth.uid()-keyed lookups, but the user_id text column
-- is used by service-side reconciliation jobs. Cheap to add.
create index if not exists idx_usr_nmexs7bytxq2_players_user_id
  on public.usr_nmexs7bytxq2_players (user_id);

-- Sectors: partial index on contested sectors. Hot path is
-- "list contested sectors so the player can deploy to one." Out of 50
-- sectors only ~2 are contested at any time — a partial index is a
-- ~25x narrower scan than the position_index full index.
create index if not exists idx_usr_nmexs7bytxq2_sectors_contested
  on public.usr_nmexs7bytxq2_sectors (contested)
  where contested = true;
