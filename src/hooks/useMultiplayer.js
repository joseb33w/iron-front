import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Multiplayer via Supabase Realtime presence. Falls back gracefully if the WS
// connection fails (some Supabase projects need the legacy JWT anon key for
// realtime) — the rest of the game still works.
export function useMultiplayer({ worldId, callsign, faction, userId, poseRef }) {
  const [remotePlayers, setRemotePlayers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!worldId || !userId) return;

    let cancelled = false;
    let tickId = null;
    const channel = supabase.channel(`world:${worldId}`, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      if (cancelled) return;
      const state = channel.presenceState();
      const list = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === userId) continue;
        const m = metas[metas.length - 1];
        if (!m) continue;
        list.push({ key, callsign: m.callsign, faction: m.faction, x: m.x, z: m.z, heading: m.heading, hp: m.hp });
      }
      setRemotePlayers(list);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !cancelled) {
        const p = poseRef.current || { x: 0, z: 0, heading: 0, hp: 100 };
        try { await channel.track({ callsign, faction, x: p.x, z: p.z, heading: p.heading, hp: p.hp }); } catch {}
        tickId = setInterval(async () => {
          if (cancelled || !channelRef.current) return;
          const p = poseRef.current || { x: 0, z: 0, heading: 0, hp: 100 };
          try { await channelRef.current.track({ callsign, faction, x: p.x, z: p.z, heading: p.heading, hp: p.hp }); } catch {}
        }, 140);
      }
    });

    return () => {
      cancelled = true;
      if (tickId) clearInterval(tickId);
      try { supabase.removeChannel(channel); } catch {}
      channelRef.current = null;
    };
  }, [worldId, userId, callsign, faction, poseRef]);

  return { remotePlayers };
}
