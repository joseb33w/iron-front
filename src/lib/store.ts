import { create } from 'zustand';
import { supabase, t, FactionRow, SectorRow } from './supabase';

type WarState = {
  factions: FactionRow[];
  sectors: SectorRow[];
  loaded: boolean;
  loadWar: () => Promise<void>;
  subscribe: () => () => void;
};

const time = {
  s: (k: string) => { try { console.time(`[ironfront] ${k}`); } catch {} },
  e: (k: string) => { try { console.timeEnd(`[ironfront] ${k}`); } catch {} },
};

export const useWarStore = create<WarState>((set, get) => ({
  factions: [],
  sectors: [],
  loaded: false,
  loadWar: async () => {
    time.s('load_war');
    const [factionsRes, sectorsRes] = await Promise.all([
      supabase.from(t('factions')).select('*'),
      supabase.from(t('sectors')).select('*').order('position_index', { ascending: true }),
    ]);
    set({
      factions: (factionsRes.data ?? []) as FactionRow[],
      sectors: (sectorsRes.data ?? []) as SectorRow[],
      loaded: true,
    });
    time.e('load_war');
  },
  subscribe: () => {
    // Realtime websocket subscribe is deferred (App calls this in an idle
    // callback after first paint). The handshake can take 300–1200 ms on
    // 4G and used to land in the critical path before "Deploy to Front"
    // became tappable.
    time.s('realtime_subscribe');
    const channel = supabase
      .channel('iron-front-war')
      .on('postgres_changes', { event: '*', schema: 'public', table: t('sectors') }, () => {
        get().loadWar();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') time.e('realtime_subscribe');
      });
    return () => { supabase.removeChannel(channel); };
  },
}));
