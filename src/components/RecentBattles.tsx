import { useEffect, useState } from 'react';
import { useWarStore } from '../lib/store';
import { supabase, t } from '../lib/supabase';

export default function RecentBattles() {
  const [rows, setRows] = useState<any[]>([]);
  const { sectors, factions } = useWarStore();
  useEffect(() => {
    supabase.from(t('battles'))
      .select('id,started_at,ended_at,sector_id,winning_faction_id,resolved,participants')
      .order('started_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  if (!rows.length) {
    return (
      <div className="panel panel-rivets p-6 text-steel-300 text-sm italic">
        No engagements logged yet. Be the first to mark the dirt.
      </div>
    );
  }
  return (
    <div className="panel panel-rivets divide-y divide-steel-500/30">
      {rows.map((b) => {
        const s = sectors.find((x) => x.id === b.sector_id);
        const f = factions.find((x) => x.id === b.winning_faction_id);
        return (
          <div key={b.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="stencil text-brass-light w-10 text-right">#{s?.position_index ?? '?'}</span>
              <span className="text-steel-100">{s?.name ?? 'unknown'}</span>
              <span className="text-[11px] text-steel-300">· {s?.biome ?? ''}</span>
            </div>
            <div className="flex items-center gap-3">
              {b.resolved ? (
                <span className="badge" style={{ color: f?.color, borderColor: f?.color }}>
                  {f?.name ?? 'Unresolved'}
                </span>
              ) : (
                <span className="badge text-crimson-light border-crimson pulse-trench">In Progress</span>
              )}
              <span className="text-[11px] text-steel-300">{new Date(b.started_at).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
