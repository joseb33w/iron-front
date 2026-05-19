import { create } from 'zustand';
import { supabase, t, FactionRow, SectorRow } from './supabase';

type WarState = {
  factions: FactionRow[];
  sectors: SectorRow[];
  loaded: boolean;
  loadWar: () => Promise<void>;
  subscribe: () => () => void;
};

export const useWarStore = create<WarState>((set, get) => ({
  factions: [],
  sectors: [],
  loaded: false,
  loadWar: async () => {
    const [factionsRes, sectorsRes] = await Promise.all([
      supabase.from(t('factions')).select('*'),
      supabase.from(t('sectors')).select('*').order('position_index', { ascending: true }),
    ]);
    set({
      factions: (factionsRes.data ?? []) as FactionRow[],
      sectors: (sectorsRes.data ?? []) as SectorRow[],
      loaded: true,
    });
  },
  subscribe: () => {
    const channel = supabase
      .channel('iron-front-war')
      .on('postgres_changes', { event: '*', schema: 'public', table: t('sectors') }, () => {
        get().loadWar();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
}));
