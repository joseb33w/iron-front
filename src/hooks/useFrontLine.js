import { useCallback, useEffect, useState } from 'react';
import { supabase, T, RPC } from '../lib/supabase';

export function useFrontLine() {
  const [front, setFront] = useState({ position: 0.5, iron_score: 0, steam_score: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from(T.frontLine)
        .select('position, iron_score, steam_score')
        .eq('id', 1)
        .maybeSingle();
      if (!cancelled && data) setFront(data);
    }
    load();

    const channel = supabase
      .channel('front-line-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: T.frontLine, filter: 'id=eq.1' },
        (payload) => {
          if (!cancelled && payload.new) {
            setFront({
              position: payload.new.position,
              iron_score: payload.new.iron_score,
              steam_score: payload.new.steam_score,
            });
          }
        },
      )
      .subscribe();

    const poll = setInterval(load, 8000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  const recordKill = useCallback(async (bunkerX, bunkerZ) => {
    const { data, error } = await supabase.rpc(RPC.recordKill, { p_bunker_x: bunkerX, p_bunker_z: bunkerZ });
    if (error) return { error: error.message };
    if (data) {
      setFront({ position: data.position, iron_score: data.iron_score, steam_score: data.steam_score });
    }
    return { data };
  }, []);

  const recordAiKill = useCallback(async () => {
    const { data, error } = await supabase.rpc(RPC.recordAiKill);
    if (error) return { error: error.message };
    return { data };
  }, []);

  const recordDeath = useCallback(async () => {
    const { data, error } = await supabase.rpc(RPC.recordDeath);
    if (error) return { error: error.message };
    return { data };
  }, []);

  return { front, recordKill, recordAiKill, recordDeath };
}
