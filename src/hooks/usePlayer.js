import { useCallback, useEffect, useState } from 'react';
import { supabase, T, RPC } from '../lib/supabase';
import { MAX_EQUIPPED } from '../game/store';

export function usePlayer(session) {
  const [player, setPlayer] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = session?.user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlayer(null);
      setInventory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pRes, iRes] = await Promise.all([
      supabase.from(T.players).select('*').eq('user_id', userId).maybeSingle(),
      supabase.from(T.inventory).select('item_id, qty').eq('user_id', userId),
    ]);
    if (pRes.error) {
      setError(pRes.error.message);
      setLoading(false);
      return;
    }
    setPlayer(pRes.data);
    setInventory(iRes.data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createPlayer = useCallback(async ({ callsign, faction }) => {
    if (!userId) return { error: 'no session' };
    const { data, error } = await supabase
      .from(T.players)
      .upsert(
        { user_id: userId, callsign, faction, total_kills: 0, best_streak: 0, scrap: 0, equipped: [], current_world: 'steppes' },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (error) return { error: error.message };
    setPlayer(data);
    return { data };
  }, [userId]);

  const setCurrentWorld = useCallback(async (worldId) => {
    if (!userId) return;
    const { data } = await supabase
      .from(T.players)
      .update({ current_world: worldId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (data) setPlayer(data);
  }, [userId]);

  const setEquipped = useCallback(async (next) => {
    if (!userId) return;
    const clipped = next.slice(0, MAX_EQUIPPED);
    setPlayer((p) => (p ? { ...p, equipped: clipped } : p));
    const { data, error } = await supabase
      .from(T.players)
      .update({ equipped: clipped, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (data) setPlayer(data);
    if (error) console.error('setEquipped failed', error);
  }, [userId]);

  const buyItem = useCallback(async (itemId, cost) => {
    const { data, error } = await supabase.rpc(RPC.buyItem, { p_item_id: itemId, p_cost: cost });
    if (error) return { error: error.message };
    if (data?.scrap !== undefined) {
      setPlayer((p) => (p ? { ...p, scrap: data.scrap } : p));
    }
    setInventory((cur) => {
      const next = cur.slice();
      const existing = next.findIndex((r) => r.item_id === itemId);
      if (existing >= 0) next[existing] = { ...next[existing], qty: (next[existing].qty || 0) + 1 };
      else next.push({ item_id: itemId, qty: 1 });
      return next;
    });
    return { data };
  }, []);

  return { player, inventory, loading, error, refresh, createPlayer, setCurrentWorld, setEquipped, buyItem };
}
