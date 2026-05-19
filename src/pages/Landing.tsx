import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWarStore } from '../lib/store';

const LazyWarStripBlock = lazy(() => import('../components/WarStripBlock'));
const LazyRecentBattles = lazy(() => import('../components/RecentBattles'));

export default function Landing() {
  const { player, session, signInAnon, enlist } = useAuth();
  const { sectors, factions, loaded } = useWarStore();
  const navigate = useNavigate();

  const [callsign, setCallsign] = useState('');
  const [chosen, setChosen] = useState<'crimson_vanguard' | 'iron_compact' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const prewarmed = useRef(false);
  const contested = sectors.filter((s) => s.contested);

  useEffect(() => {
    if (player?.faction_id) {
      const f = factions.find((x) => x.id === player.faction_id);
      if (f) setChosen(f.slug);
      setCallsign(player.callsign);
    }
  }, [player, factions]);

  // Pre-warm anonymous sign-in as soon as the form mounts. By the time
  // the user finishes typing their callsign and taps "Enlist", the
  // session is already live and the click is one fast RPC call.
  useEffect(() => {
    if (prewarmed.current) return;
    if (session) return;
    prewarmed.current = true;
    const w = window as any;
    const fire = () => {
      try { console.time('[ironfront] prewarm_signin'); } catch {}
      signInAnon().catch(() => {}).finally(() => {
        try { console.timeEnd('[ironfront] prewarm_signin'); } catch {}
      });
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(fire, { timeout: 1200 });
    } else {
      setTimeout(fire, 300);
    }
  }, [session, signInAnon]);

  const onEnlist = async () => {
    setErr(null);
    if (!callsign.trim() || !chosen) {
      setErr('Choose a faction and a callsign, soldier.');
      return;
    }
    setBusy(true);
    try {
      console.time('[ironfront] enlist_total');
      if (!session) await signInAnon();
      await enlist(callsign.trim(), chosen);
    } catch (e: any) {
      setErr(e?.message ?? 'Enlistment failed');
    } finally {
      try { console.timeEnd('[ironfront] enlist_total'); } catch {}
      setBusy(false);
    }
  };

  const onDeploy = () => {
    if (!player?.faction_id || !contested.length) return;
    const sector = contested[0];
    navigate(`/battle/${sector.position_index}`);
  };

  const factionOf = (slug: string) => factions.find((f) => f.slug === slug);

  return (
    <div className="relative">
      <Hero />

      {/* Order on mobile: form first (so first-paint → tappable Enlist
          is fast), then war strip + stats below. Desktop preserves the
          original two-column read where the strip sits at the top. */}
      <section className="mx-3 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3 order-1 lg:order-2">
        <div className="panel panel-rivets p-5 sm:p-6">
          <h3 className="stencil text-brass-light text-lg mb-1">Enlistment Form 14-B</h3>
          <p className="text-steel-200 text-sm mb-5">
            Sign your name. Pick a side. <em>Faction loyalty is permanent — no defectors.</em>
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FactionPick
              active={chosen === 'crimson_vanguard'}
              locked={!!player?.loyalty_locked && player?.faction_id !== factionOf('crimson_vanguard')?.id}
              onClick={() => setChosen('crimson_vanguard')}
              name="Crimson Vanguard"
              motto="By Iron and Fire"
              color="#c0392b"
              accent="#7a1f17"
            />
            <FactionPick
              active={chosen === 'iron_compact'}
              locked={!!player?.loyalty_locked && player?.faction_id !== factionOf('iron_compact')?.id}
              onClick={() => setChosen('iron_compact')}
              name="Iron Compact"
              motto="The Compact Stands"
              color="#bdc3c7"
              accent="#34495e"
            />
          </div>
          <label htmlFor="callsign-input" className="block text-[11px] text-steel-300 tracking-widest uppercase mb-1">Callsign</label>
          <input
            id="callsign-input"
            type="text"
            inputMode="text"
            autoComplete="username"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="input w-full font-stencil tracking-widest"
            placeholder="e.g. BLACK-DOG-07"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase().slice(0, 24))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy && !player?.loyalty_locked) onEnlist(); }}
            disabled={!!player?.loyalty_locked}
          />
          {err && <div className="mt-3 text-crimson-light text-sm">{err}</div>}
          <div className="flex flex-wrap gap-3 mt-4">
            {!player?.loyalty_locked && (
              <button className="btn-brass" disabled={busy} onClick={onEnlist}>
                {busy ? 'Stamping papers…' : player ? 'Confirm Enlistment' : 'Enlist'}
              </button>
            )}
            <button
              className="btn-crimson"
              disabled={!player?.faction_id || contested.length === 0}
              onClick={onDeploy}
              title={!player?.faction_id ? 'Enlist first' : ''}
            >
              ▸ Deploy to Front
            </button>
          </div>
          {player && (
            <div className="mt-5 text-xs text-steel-300 tracking-wider">
              Active service: <span className="text-brass-light stencil">{player.callsign}</span> ·
              Rank <span className="text-brass-light stencil"> {player.rank}</span> ·
              Armor kills <span className="text-brass-light stencil">{player.cruisers_destroyed}</span>
            </div>
          )}
        </div>

        <div className="panel panel-rivets p-5 sm:p-6">
          <h3 className="stencil text-brass-light text-lg mb-3">Field Doctrine</h3>
          <ul className="space-y-2 text-sm text-steel-100">
            <Li><strong className="text-brass-light">One front, one war.</strong> Each match advances or cedes a sector. Lose enough, your capital falls.</Li>
            <Li><strong className="text-brass-light">Adjacency rule.</strong> A sector only flips if it borders the current front. No teleporting an attack 12 sectors deep.</Li>
            <Li><strong className="text-brass-light">Crew the cruiser.</strong> Driver, gunner, hatch MG, commander on the periscope. (Crewmate multiplayer wiring in roadmap.)</Li>
            <Li><strong className="text-brass-light">Armor angle matters.</strong> Penetration checks are <em>server-side</em>. Shallow hits ricochet. Plates are cheaper than coffins.</Li>
            <Li><strong className="text-brass-light">Sunday reset.</strong> The front returns to sector 25 every Sunday 00:00 UTC. Make the week count.</Li>
          </ul>
        </div>
      </section>

      <section className="mx-3 mt-6 order-2 lg:order-1">
        <div className="flex items-end justify-between mb-2 px-2">
          <h2 className="stencil text-brass-light text-xl">— GLOBAL FRONT LINE —</h2>
          <div className="text-[11px] text-steel-300 tracking-wider">
            {loaded ? `${contested.length} contested sectors` : 'Receiving telegraph…'}
          </div>
        </div>
        <Suspense fallback={<WarStripFallback />}>
          <LazyWarStripBlock />
        </Suspense>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Crimson Vanguard" value={
            sectors.filter(s => factionOf('crimson_vanguard')?.id === s.owner_faction_id).length
          } color="#c0392b" suffix=" sectors" />
          <Stat label="Iron Compact" value={
            sectors.filter(s => factionOf('iron_compact')?.id === s.owner_faction_id).length
          } color="#bdc3c7" suffix=" sectors" />
          <Stat label="Front Position" value={
            sectors.find(s => s.contested)?.position_index ?? '—'
          } color="#ff4030" suffix="/49" />
          <Stat label="Resets" value="Sun 00:00 UTC" color="#d4af6a" suffix="" />
        </div>
      </section>

      <section className="mx-3 mt-6 mb-10">
        <h3 className="stencil text-brass-light text-lg mb-2">Recent Engagements</h3>
        <Suspense fallback={<div className="panel panel-rivets p-6 text-steel-300 text-sm italic">Loading dispatches…</div>}>
          <LazyRecentBattles />
        </Suspense>
      </section>
    </div>
  );
}

function WarStripFallback() {
  return (
    <div className="panel panel-rivets p-4 text-center text-steel-300 stencil text-sm" style={{ minHeight: 120 }}>
      Receiving telegraph…
    </div>
  );
}

function Hero() {
  return (
    <section className="relative mx-3 mt-3 panel panel-rivets overflow-hidden">
      <div className="px-5 sm:px-6 py-8 sm:py-10 md:py-14 relative z-10">
        <div className="text-[11px] tracking-[0.4em] text-crimson-light uppercase">— Year 1947. The war never ended. —</div>
        <h1 className="font-stencil text-3xl sm:text-4xl md:text-6xl text-brass-light mt-2 leading-tight">
          IRON&nbsp;FRONT
        </h1>
        <p className="mt-3 max-w-2xl text-steel-200 text-sm md:text-base">
          Dieselpunk armored combat across a persistent 50-sector front line. Two factions, one trench, one war —
          fought in real time by players the world over. Your sector wins push the line east; your losses give it back.
        </p>
      </div>
      <BackgroundRails />
    </section>
  );
}

function BackgroundRails() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 600 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bgg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#1a1a17" />
          <stop offset="1" stopColor="#0a0a08" />
        </linearGradient>
      </defs>
      <rect width="600" height="200" fill="url(#bgg)" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={i} x1={i * 28} x2={i * 28 + 6} y1={160} y2={200} stroke="#3a3a32" strokeWidth="2" />
      ))}
      <line x1="0" x2="600" y1="170" y2="170" stroke="#4a3a22" strokeWidth="1.4" />
      <line x1="0" x2="600" y1="178" y2="178" stroke="#4a3a22" strokeWidth="1.4" />
      <path d="M0 200 L600 200 L600 130 Q300 100 0 140 Z" fill="#0c0c0a" opacity="0.6" />
    </svg>
  );
}

function FactionPick({
  active, locked, onClick, name, motto, color, accent,
}: {
  active: boolean; locked: boolean; onClick: () => void;
  name: string; motto: string; color: string; accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      style={{ minHeight: 72 }}
      className={`relative panel p-4 text-left transition-all ${active ? 'ring-2 ring-brass scale-[1.01]' : 'opacity-90'} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded" style={{ background: `linear-gradient(135deg, ${color}, ${accent})`, border: `1px solid ${color}` }} />
        <div>
          <div className="stencil text-brass-light leading-tight">{name}</div>
          <div className="text-[11px] text-steel-300 italic">"{motto}"</div>
        </div>
      </div>
      {locked && <div className="absolute top-2 right-2 text-[10px] tracking-widest text-crimson-light">LOCKED</div>}
    </button>
  );
}

function Stat({ label, value, color, suffix }: { label: string; value: any; color: string; suffix: string }) {
  return (
    <div className="panel panel-rivets px-4 py-3">
      <div className="text-[10px] text-steel-300 tracking-widest uppercase">{label}</div>
      <div className="stencil text-2xl" style={{ color }}>{value}<span className="text-sm opacity-70">{suffix}</span></div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-brass">▸</span>
      <span>{children}</span>
    </li>
  );
}
