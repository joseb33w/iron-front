import { useWarStore } from '../lib/store';
import { FactionRow, SectorRow } from '../lib/supabase';
import { useMemo } from 'react';

type Props = {
  height?: number;
  showLabels?: boolean;
  highlightIndex?: number | null;
  onSectorClick?: (s: SectorRow) => void;
};

export function WarStrip({ height = 110, showLabels = true, highlightIndex = null, onSectorClick }: Props) {
  const { sectors, factions } = useWarStore();

  const colorFor = useMemo(() => {
    const map = new Map<string, string>();
    factions.forEach((f: FactionRow) => map.set(f.id, f.color));
    return (id: string | null) => (id ? map.get(id) ?? '#444' : '#444');
  }, [factions]);

  const trenchD = useMemo(() => buildTrenchPath(sectors), [sectors]);

  if (!sectors.length) {
    return (
      <div className="panel panel-rivets p-6 text-center text-steel-300 stencil text-sm">
        Awaiting field reports…
      </div>
    );
  }

  const W = 1000;
  const H = height;
  const cellW = W / 50;

  return (
    <div className="panel panel-rivets p-4 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a1a17" />
            <stop offset="1" stopColor="#0a0a08" />
          </linearGradient>
          <linearGradient id="crimson_g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#c0392b" />
            <stop offset="1" stopColor="#6e1f17" />
          </linearGradient>
          <linearGradient id="iron_g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8a949a" />
            <stop offset="1" stopColor="#384149" />
          </linearGradient>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" x2="0" y1="0" y2="6" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#sky)" />

        {sectors.map((s) => {
          const x = s.position_index * cellW;
          const isCrimson = factions.find((f) => f.id === s.owner_faction_id)?.slug === 'crimson_vanguard';
          const fill = isCrimson ? 'url(#crimson_g)' : 'url(#iron_g)';
          const isHi = highlightIndex === s.position_index;
          return (
            <g key={s.id}
               onClick={() => onSectorClick?.(s)}
               style={{ cursor: onSectorClick ? 'pointer' : 'default' }}>
              <rect
                x={x + 0.5}
                y={6}
                width={cellW - 1}
                height={H - 12}
                fill={fill}
                stroke={isHi ? '#fff7d8' : 'rgba(0,0,0,0.45)'}
                strokeWidth={isHi ? 2 : 0.5}
              />
              {s.contested && (
                <rect
                  x={x + 0.5}
                  y={6}
                  width={cellW - 1}
                  height={H - 12}
                  fill="url(#hatch)"
                  className="pulse-trench"
                />
              )}
              {showLabels && (s.position_index % 5 === 0) && (
                <text
                  x={x + cellW / 2}
                  y={H - 2}
                  textAnchor="middle"
                  fontSize={7}
                  fill={colorFor(s.owner_faction_id)}
                  className="stencil"
                >
                  {s.position_index}
                </text>
              )}
            </g>
          );
        })}

        {/* Jagged red trench front line */}
        {trenchD && (
          <path
            d={trenchD}
            fill="none"
            stroke="#ff4030"
            strokeWidth={2.5}
            strokeLinejoin="miter"
            strokeLinecap="butt"
            style={{ filter: 'drop-shadow(0 0 5px #ff4030)' }}
          />
        )}

        {/* Capital markers */}
        <CapitalMark x={cellW / 2} h={H} side="crimson" label="VANGUARD HQ" />
        <CapitalMark x={W - cellW / 2} h={H} side="iron" label="COMPACT HQ" />
      </svg>
    </div>
  );
}

function CapitalMark({ x, h, side, label }: { x: number; h: number; side: 'crimson' | 'iron'; label: string }) {
  const color = side === 'crimson' ? '#c0392b' : '#7f8c8d';
  return (
    <g>
      <polygon
        points={`${x},2 ${x - 4},10 ${x + 4},10`}
        fill={color}
        stroke="#b08d57"
        strokeWidth={0.7}
      />
      <text
        x={x}
        y={h - 14}
        textAnchor="middle"
        fontSize={5}
        fill="#d4af6a"
        className="stencil"
        opacity={0.85}
      >
        {label}
      </text>
    </g>
  );
}

function buildTrenchPath(sectors: SectorRow[]): string | null {
  if (sectors.length < 2) return null;
  // Find the first sector where ownership changes — that's the front
  let frontIndex = -1;
  for (let i = 1; i < sectors.length; i++) {
    if (sectors[i].owner_faction_id !== sectors[i - 1].owner_faction_id) {
      frontIndex = i;
      break;
    }
  }
  if (frontIndex === -1) return null;

  const W = 1000;
  const H = 110;
  const cellW = W / 50;
  const x = frontIndex * cellW;

  // Draw a jagged vertical trench at x, with little zigzag teeth
  const teeth = 8;
  const stepY = (H - 12) / teeth;
  let d = `M ${x} 6 `;
  for (let i = 0; i < teeth; i++) {
    const off = (i % 2 === 0 ? -1 : 1) * 4;
    d += `L ${x + off} ${6 + stepY * (i + 0.5)} `;
    d += `L ${x} ${6 + stepY * (i + 1)} `;
  }
  return d;
}
