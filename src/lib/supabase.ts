import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.warn('Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const TABLE_PREFIX = (import.meta.env.VITE_TABLE_PREFIX as string) || 'usr_nmexs7bytxq2';
export const t = (name: string) => `${TABLE_PREFIX}_${name}`;
export const rpc = (fn: string) => `${TABLE_PREFIX}_${fn}`;

export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type FactionRow = {
  id: string;
  slug: 'crimson_vanguard' | 'iron_compact';
  name: string;
  color: string;
  capital_sector_id: number;
  current_territory: number[];
};

export type SectorRow = {
  id: string;
  position_index: number;
  name: string;
  owner_faction_id: string | null;
  contested: boolean;
  biome: 'ruined_city' | 'trench_network' | 'scorched_farmland' | 'industrial_yard' | 'frozen_north' | 'muddy_lowland';
  last_battle_at: string | null;
  battles_won_count: number;
};

export type PlayerRow = {
  id: string;
  user_id: string;
  callsign: string;
  faction_id: string | null;
  kills: number;
  deaths: number;
  cruisers_destroyed: number;
  rank: 'Recruit' | 'Sergeant' | 'Major' | 'General';
  medals: { code: string; awarded_at: string }[];
  loyalty_locked: boolean;
};

export type BattleRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  sector_id: string;
  attacking_faction_id: string | null;
  defending_faction_id: string | null;
  winning_faction_id: string | null;
  participants: { user_id: string; callsign: string; faction_slug: string }[];
  resolved: boolean;
};
