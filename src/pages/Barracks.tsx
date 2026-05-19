import { useAuth } from '../lib/auth';
import { useWarStore } from '../lib/store';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const MEDAL_CATALOG: { code: string; name: string; desc: string; icon: string; color: string }[] = [
  { code: 'first_blood', name: 'First Blood', desc: 'Score your first kill.', icon: '🩸', color: '#c0392b' },
  { code: 'ace_gunner', name: 'Ace Gunner', desc: '10 kills in one match.', icon: '🎯', color: '#d4af6a' },
  { code: 'iron_will',  name: 'Iron Will', desc: 'Finish a battle with damaged cruiser.', icon: '⚙', color: '#7f8c8d' },
  { code: 'breakthrough', name: 'Breakthrough', desc: 'Win 5 contested sectors.', icon: '⚔', color: '#e67e22' },
  { code: 'redoubt', name: 'Redoubt', desc: 'Successfully hold a contested sector.', icon: '🛡', color: '#27ae60' },
  { code: 'capital_kisser', name: 'Capital Kisser', desc: 'Fight within 3 sectors of enemy capital.', icon: '🏰', color: '#9b59b6' },
];

const RANK_ICONS: Record<string, string> = {
  Recruit: '◆',
  Sergeant: '◆◆',
  Major: '◆◆◆',
  General: '★ ◆◆◆',
};

export default function Barracks() {
  const { player, session, signInAnon } = useAuth();
  const { factions, sectors } = useWarStore();

  const faction = useMemo(() => factions.find((f) => f.id === player?.faction_id), [factions, player]);
  const territoryCount = useMemo(() => sectors.filter((s) => s.owner_faction_id === faction?.id).length, [sectors, faction]);
  const earnedMedals = useMemo(() => new Set((player?.medals ?? []).map((m: any) => m.code)), [player]);

  if (!session) {
    return (
      <div className="mx-3 my-6 panel panel-rivets p-8 text-center">
        <h2 className="stencil text-brass-light text-xl mb-2">No Service Record</h2>
        <p className="text-steel-200 mb-4 text-sm">You haven't enlisted yet. Sign the papers to receive a barracks slot.</p>
        <button className="btn-brass" onClick={signInAnon}>Sign Papers</button>
        <div className="mt-3"><Link to="/" className="text-brass-light text-xs underline">return to briefing</Link></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-3 my-6 panel panel-rivets p-8 text-center">
        <h2 className="stencil text-brass-light text-xl mb-2">Awaiting Assignment</h2>
        <p className="text-steel-200 text-sm">Complete enlistment on the briefing page to receive your service record.</p>
        <div className="mt-3"><Link to="/" className="text-brass-light underline">go to briefing</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-3 my-3 space-y-3">
      <div className="panel panel-rivets p-6 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
        <div className="relative w-32 h-32 rounded-md panel flex items-center justify-center"
             style={{ background: `radial-gradient(circle, ${faction?.color}33 0%, transparent 70%)`, borderColor: faction?.color }}>
          <div className="text-center">
            <div className="text-3xl">{RANK_ICONS[player.rank]}</div>
            <div className="stencil text-brass-light mt-1 text-sm">{player.rank}</div>
          </div>
        </div>
        <div>
          <div className="text-[11px] tracking-widest text-steel-300 uppercase">Service Record</div>
          <h2 className="stencil text-3xl text-brass-light leading-tight">{player.callsign}</h2>
          <div className="mt-1 text-sm">
            <span style={{ color: faction?.color }}>{faction?.name ?? 'unaffiliated'}</span>
            {player.loyalty_locked && <span className="ml-2 text-[10px] tracking-widest text-steel-300">[ LOYALTY LOCKED ]</span>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
            <Box label="Armor Kills" value={player.cruisers_destroyed} />
            <Box label="Kills" value={player.kills} />
            <Box label="Deaths" value={player.deaths} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest text-steel-300 uppercase">Faction Territory</div>
          <div className="stencil text-4xl" style={{ color: faction?.color }}>{territoryCount}</div>
          <div className="text-[11px] text-steel-300">of 50 sectors</div>
        </div>
      </div>

      <div className="panel panel-rivets p-6">
        <h3 className="stencil text-brass-light text-lg mb-3">Promotion Track</h3>
        <div className="relative">
          <div className="h-1.5 bg-steel-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-brass"
              style={{ width: `${rankProgress(player.cruisers_destroyed) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <RankNode label="Recruit" need={0} got={player.cruisers_destroyed} />
            <RankNode label="Sergeant" need={5} got={player.cruisers_destroyed} />
            <RankNode label="Major" need={20} got={player.cruisers_destroyed} />
            <RankNode label="General" need={50} got={player.cruisers_destroyed} />
          </div>
        </div>
      </div>

      <div className="panel panel-rivets p-6">
        <h3 className="stencil text-brass-light text-lg mb-3">Medals & Citations</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {MEDAL_CATALOG.map((m) => {
            const got = earnedMedals.has(m.code);
            return (
              <div
                key={m.code}
                className={`panel p-3 text-center transition-all ${got ? '' : 'opacity-40 grayscale'}`}
                style={got ? { borderColor: m.color, boxShadow: `inset 0 0 30px ${m.color}33` } : {}}
              >
                <div className="text-3xl mb-1">{m.icon}</div>
                <div className="stencil text-brass-light text-xs">{m.name}</div>
                <div className="text-[10px] text-steel-300 leading-snug mt-1">{m.desc}</div>
              </div>
            );
          })}
        </div>
        {!earnedMedals.size && (
          <p className="text-steel-300 text-xs mt-3 italic">
            No citations yet. Earn medals through battlefield deeds — your faction's archivist updates the wall after each campaign.
          </p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Link to="/warmap" className="btn-iron !text-xs">◀ View War Map</Link>
        <Link to="/" className="btn-crimson !text-xs">Briefing & Deploy ▶</Link>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-3 text-center">
      <div className="stencil text-2xl text-brass-light">{value}</div>
      <div className="text-[10px] text-steel-300 tracking-widest uppercase">{label}</div>
    </div>
  );
}

function RankNode({ label, need, got }: { label: string; need: number; got: number }) {
  const achieved = got >= need;
  return (
    <div className={`text-center w-16 ${achieved ? 'text-brass-light' : 'text-steel-300'}`}>
      <div className={`mx-auto mb-1 w-3 h-3 rounded-full ${achieved ? 'bg-brass' : 'bg-steel-500 border border-steel-300'}`} />
      <div className="stencil text-[10px]">{label}</div>
      <div className="text-[9px]">{need} kills</div>
    </div>
  );
}

function rankProgress(kills: number): number {
  if (kills >= 50) return 1;
  if (kills >= 20) return 0.66 + ((kills - 20) / 30) * 0.34;
  if (kills >= 5)  return 0.33 + ((kills - 5) / 15) * 0.33;
  return Math.min(1, kills / 5) * 0.33;
}
