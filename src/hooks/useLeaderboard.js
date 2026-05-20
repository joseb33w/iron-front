import { useEffect, useState } from 'react';
import { supabase, T } from '../lib/supabase';

export function useLeaderboard(limit = 8) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from(T.players)
        .select('callsign, faction, total_kills')
        .order('total_kills', { ascending: false })
        .limit(limit);
      if (!cancelled && data) setRows(data);
    }
    load();
    const poll = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [limit]);

  return rows;
}
