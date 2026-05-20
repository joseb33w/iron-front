import { useCallback, useEffect, useState } from 'react';
import { supabase, T } from '../lib/supabase';

export function usePlayer(session) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = session?.user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlayer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(T.players)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setPlayer(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createPlayer = useCallback(async ({ callsign, faction }) => {
    if (!userId) return { error: 'no session' };
    const { data, error } = await supabase
      .from(T.players)
      .upsert(
        { user_id: userId, callsign, faction, total_kills: 0, best_streak: 0 },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (error) return { error: error.message };
    setPlayer(data);
    return { data };
  }, [userId]);

  return { player, loading, error, refresh, createPlayer };
}
