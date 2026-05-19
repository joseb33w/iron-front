import { useEffect, useState } from 'react';

type Props = {
  sectorIndex: number;
  sectorName: string;
  biome: string;
  factionColor: string;
  factionName: string;
  inventory: { AP: number; HE: number; SMOKE: number };
  selectedShell: 'AP' | 'HE' | 'SMOKE';
  setSelectedShell: (s: 'AP' | 'HE' | 'SMOKE') => void;
  log: string[];
};

export function BattleHUD({
  sectorIndex, sectorName, biome, factionColor, factionName,
  inventory, selectedShell, setSelectedShell, log,
}: Props) {
  const [showControls, setShowControls] = useState(true);

  // Show controls panel for first 6 seconds
  useEffect(() => {
    const tid = setTimeout(() => setShowControls(false), 6000);
    return () => clearTimeout(tid);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {/* Top status strip */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-3">
        <div className="panel panel-rivets px-4 py-2 text-xs pointer-events-auto">
          <div className="stencil text-brass-light text-sm">
            SECTOR {sectorIndex} · {sectorName}
          </div>
          <div className="text-steel-300 text-[10px] tracking-widest uppercase">
            {biome.replace('_', ' ')} · {factionName}
          </div>
        </div>

        <div className="panel panel-rivets px-4 py-2 text-xs pointer-events-auto" style={{ borderColor: factionColor }}>
          <div className="text-[10px] tracking-widest text-steel-300">CALLSIGN</div>
          <div className="stencil text-sm" style={{ color: factionColor }}>HULL-7</div>
        </div>
      </div>

      {/* Brass-rimmed periscope frame (gunner view) */}
      <PeriscopeFrame />

      {/* Range-finder reticle */}
      <RangeReticle />

      {/* Bottom HUD row: ammo wheel + horizon + log */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3">
        {/* Ammo wheel */}
        <div className="pointer-events-auto">
          <AmmoWheel inventory={inventory} selected={selectedShell} setSelected={setSelectedShell} />
        </div>

        {/* Combat log */}
        <div className="panel panel-rivets px-3 py-2 max-w-md flex-1 mx-2">
          <div className="text-[10px] tracking-widest text-steel-300 mb-1">COMBAT LOG</div>
          {log.length === 0 ? (
            <div className="text-steel-300 text-xs italic">— wait for orders —</div>
          ) : (
            <div className="space-y-0.5">
              {log.slice(-5).map((line, i) => (
                <div key={i} className="text-[11px] text-brass-light font-mono">{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Artificial horizon */}
        <ArtificialHorizon />
      </div>

      {/* Controls help overlay */}
      {showControls && (
        <div className="absolute top-20 right-3 panel panel-rivets p-4 max-w-xs text-xs pointer-events-auto">
          <div className="stencil text-brass-light mb-2">FIELD MANUAL</div>
          <div className="space-y-1 text-steel-100">
            <KeyRow keys="W A S D" label="Drive cruiser" />
            <KeyRow keys="Q E" label="Traverse turret" />
            <KeyRow keys="R F" label="Elevate barrel" />
            <KeyRow keys="1 2 3" label="Select shell" />
            <KeyRow keys="SPACE" label="Fire main gun" />
          </div>
          <button className="btn-brass !text-[10px] !py-1 !px-2 mt-3" onClick={() => setShowControls(false)}>
            Dismiss
          </button>
        </div>
      )}

      <ShellKeybinds setSelected={setSelectedShell} />
    </div>
  );
}

function KeyRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-mono text-brass-light">{keys}</span>
      <span className="text-steel-200">{label}</span>
    </div>
  );
}

function PeriscopeFrame() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 700" preserveAspectRatio="none">
      {/* outer vignette */}
      <defs>
        <radialGradient id="vig" cx="50%" cy="50%" r="60%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
        </radialGradient>
        <radialGradient id="rim" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="rgba(0,0,0,0)" />
          <stop offset="92%" stopColor="rgba(176, 141, 87, 0.4)" />
          <stop offset="100%" stopColor="rgba(176, 141, 87, 0.9)" />
        </radialGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#vig)" />
      <ellipse cx="500" cy="350" rx="430" ry="320" fill="none" stroke="url(#rim)" strokeWidth="22" />
      <ellipse cx="500" cy="350" rx="430" ry="320" fill="none" stroke="#7a5b30" strokeWidth="3" opacity="0.6" />

      {/* crack lines (driver's vision slit illusion) */}
      <g opacity="0.18" stroke="#fff" strokeWidth="0.5" fill="none">
        <path d="M 250 200 L 340 240 L 380 220 L 480 280" />
        <path d="M 720 150 L 700 200 L 750 240 L 720 320" />
      </g>
    </svg>
  );
}

function RangeReticle() {
  return (
    <svg className="absolute inset-0 m-auto pointer-events-none" width="320" height="320" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <g stroke="#d4af6a" fill="none" strokeWidth="1.2" opacity="0.85">
        <circle cx="160" cy="160" r="140" />
        <circle cx="160" cy="160" r="6" />
        {/* horizontal hash */}
        <line x1="20"  y1="160" x2="80"  y2="160" />
        <line x1="240" y1="160" x2="300" y2="160" />
        {/* vertical hash */}
        <line x1="160" y1="20"  x2="160" y2="80" />
        <line x1="160" y1="240" x2="160" y2="300" />
        {/* range ticks (elevation) */}
        {[0,1,2,3,4,5].map(i => (
          <g key={i}>
            <line x1="156" y1={160 + i * 16} x2="164" y2={160 + i * 16} />
            <text x="170" y={163 + i * 16} fontSize="8" fill="#d4af6a" className="stencil">{(i * 500)}</text>
          </g>
        ))}
        {/* aim chevron */}
        <path d="M 160 152 L 152 168 L 168 168 Z" fill="#d4af6a" />
      </g>
    </svg>
  );
}

function AmmoWheel({ inventory, selected, setSelected }: {
  inventory: { AP: number; HE: number; SMOKE: number };
  selected: 'AP' | 'HE' | 'SMOKE';
  setSelected: (s: 'AP' | 'HE' | 'SMOKE') => void;
}) {
  const types: { code: 'AP' | 'HE' | 'SMOKE'; label: string; color: string; hot: string }[] = [
    { code: 'AP', label: 'AP', color: '#7a5b30', hot: '#d4af6a' },
    { code: 'HE', label: 'HE', color: '#7a2118', hot: '#ff6020' },
    { code: 'SMOKE', label: 'SM', color: '#444', hot: '#aaa' },
  ];
  return (
    <div className="panel panel-rivets p-2 flex items-center gap-2">
      {types.map((t, i) => {
        const isSel = selected === t.code;
        const count = inventory[t.code];
        return (
          <button
            key={t.code}
            onClick={() => setSelected(t.code)}
            disabled={count === 0}
            className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${isSel ? 'scale-110' : 'opacity-80 hover:opacity-100'} ${count === 0 ? 'opacity-30' : ''}`}
            style={{ borderColor: isSel ? t.hot : t.color, background: `radial-gradient(circle, ${t.color}55, ${t.color}11)` }}
          >
            <div className="text-center">
              <div className="stencil text-sm" style={{ color: t.hot }}>{t.label}</div>
              <div className="text-[10px] text-steel-200 font-mono">{count}</div>
            </div>
            <span className="absolute -top-1 -left-1 text-[9px] bg-steel-700 px-1 rounded text-brass-light">{i + 1}</span>
          </button>
        );
      })}
    </div>
  );
}

function ArtificialHorizon() {
  return (
    <div className="panel panel-rivets w-24 h-24 relative overflow-hidden rounded-full">
      <div
        className="absolute inset-2 rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #8a5a30 50%, #1a1a17 50%)' }}
      >
        {/* tilted center line representing pitch */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-brass-light" />
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-brass-light" />
        {/* "wings" indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-px bg-brass-light/70" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] stencil text-brass-light/80">HOR</div>
    </div>
  );
}

function ShellKeybinds({ setSelected }: { setSelected: (s: 'AP' | 'HE' | 'SMOKE') => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') setSelected('AP');
      if (e.code === 'Digit2') setSelected('HE');
      if (e.code === 'Digit3') setSelected('SMOKE');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelected]);
  return null;
}
