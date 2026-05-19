import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Float } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useWarStore } from '../lib/store';
import { SectorRow } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { WarStrip } from '../components/WarStrip';
import { supabase, t } from '../lib/supabase';
import { tierTuning } from '../lib/device';
import { useSettings } from '../lib/settings';

const TILE_W = 1.0;
const TILE_GAP = 0.05;
const TILE_LEN = 50 * (TILE_W + TILE_GAP);

export default function WarMap() {
  const { sectors, factions } = useWarStore();
  const [hovered, setHovered] = useState<SectorRow | null>(null);
  const [feed, setFeed] = useState<{ when: string; text: string; color: string }[]>([]);
  const navigate = useNavigate();
  const { player } = useAuth();
  const tier = useSettings((s) => s.graphicsTier);
  const tuningGfx = useMemo(() => tierTuning(tier), [tier]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from(t('battles'))
        .select('started_at,sector_id,winning_faction_id,resolved')
        .order('started_at', { ascending: false })
        .limit(8);
      if (cancelled || !data) return;
      const items = data.map((b: any) => {
        const s = sectors.find((x) => x.id === b.sector_id);
        const f = factions.find((x) => x.id === b.winning_faction_id);
        const ago = new Date(b.started_at).toLocaleTimeString();
        if (b.resolved && f) {
          return { when: ago, text: `${f.name} pushed through Sector ${s?.position_index} — ${s?.name}`, color: f.color };
        }
        return { when: ago, text: `Engagement in Sector ${s?.position_index} — ${s?.name}`, color: '#ff4030' };
      });
      setFeed(items);
    };
    if (sectors.length && factions.length) load();
    const i = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(i); };
  }, [sectors, factions]);

  return (
    <div className="mx-3 my-3 grid lg:grid-cols-[1fr_320px] gap-3">
      <div className="panel panel-rivets overflow-hidden h-[68vh] min-h-[460px] relative">
        <Canvas
          camera={{ position: [0, 8, 18], fov: 38 }}
          shadows={tuningGfx.shadowMapSize > 0}
          dpr={[1, tuningGfx.dprMax]}
          gl={{ antialias: tuningGfx.antialias }}
        >
          <color attach="background" args={['#0a0a08']} />
          <fog attach="fog" args={['#0a0a08', 22, 60]} />
          <Stars radius={50} depth={20} count={tuningGfx.warmapStars} factor={1.5} fade speed={0.4} />
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[8, 14, 6]}
            intensity={1.1}
            castShadow={tuningGfx.shadowMapSize > 0}
            color="#ffd9a0"
            shadow-mapSize-width={tuningGfx.shadowMapSize}
            shadow-mapSize-height={tuningGfx.shadowMapSize}
          />
          <directionalLight position={[-10, 6, -3]} intensity={0.3} color="#7090ff" />
          <pointLight position={[-TILE_LEN / 2, 1.5, 0]} intensity={1.8} distance={5} color="#c0392b" />
          <pointLight position={[TILE_LEN / 2, 1.5, 0]} intensity={1.8} distance={5} color="#bdc3c7" />

          <group position={[-TILE_LEN / 2, 0, 0]}>
            {sectors.map((s) => (
              <SectorTile
                key={s.id}
                sector={s}
                color={factions.find((f) => f.id === s.owner_faction_id)?.color ?? '#444'}
                isCrimson={factions.find((f) => f.id === s.owner_faction_id)?.slug === 'crimson_vanguard'}
                onHover={(in_) => setHovered(in_ ? s : (cur) => (cur?.id === s.id ? null : cur))}
                onClick={() => {
                  if (!s.contested) return;
                  if (!player?.faction_id) return navigate('/');
                  navigate(`/battle/${s.position_index}`);
                }}
              />
            ))}
          </group>

          <FrontLine sectors={sectors} factions={factions} />

          <CapitalMonument side="crimson" x={0 - TILE_W / 2 - 1.5} />
          <CapitalMonument side="iron" x={TILE_LEN - TILE_W / 2 + 1.5} />

          <gridHelper args={[80, 40, '#3a2a18', '#1a1a14']} position={[0, -0.2, 0]} />
          <OrbitControls
            target={[0, 0, 0]}
            enablePan
            minDistance={5}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>

        {hovered && (
          <div className="absolute top-3 left-3 panel panel-rivets px-4 py-3 max-w-xs text-sm pointer-events-none">
            <div className="stencil text-brass-light">
              SECTOR {hovered.position_index} · {hovered.name}
            </div>
            <div className="text-[11px] text-steel-300 mb-2">{biomeLabel(hovered.biome)}</div>
            <div className="text-steel-100">
              Owner: <span style={{ color: factions.find((f) => f.id === hovered.owner_faction_id)?.color }}>
                {factions.find((f) => f.id === hovered.owner_faction_id)?.name ?? '—'}
              </span>
            </div>
            <div className="text-steel-100">Battles won here: {hovered.battles_won_count}</div>
            {hovered.contested && (
              <div className="mt-2 text-crimson-light text-xs pulse-trench">⚔ CONTESTED — click to deploy</div>
            )}
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
          <div className="text-[10px] tracking-widest text-steel-300 mb-1">SCROLL · ZOOM · DRAG · CLICK CONTESTED SECTORS TO DEPLOY</div>
          <WarStrip height={64} showLabels={false} highlightIndex={hovered?.position_index ?? null} />
        </div>
      </div>

      <div className="panel panel-rivets p-3 h-[68vh] min-h-[460px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="stencil text-brass-light text-sm">Field Telegraph</h3>
          <span className="text-[10px] text-steel-300 tracking-widest pulse-trench">LIVE</span>
        </div>
        <div className="overflow-auto pr-1 flex-1 space-y-2">
          {!feed.length && (
            <div className="text-steel-300 text-xs italic px-2">No engagements yet. The wires are quiet.</div>
          )}
          {feed.map((row, i) => (
            <div key={i} className="text-xs leading-snug px-2 py-1.5 border-l-2"
                 style={{ borderColor: row.color }}>
              <div className="text-steel-300 stencil text-[10px]">{row.when}</div>
              <div className="text-steel-100">{row.text}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 panel p-3">
          <div className="stencil text-brass-light text-xs mb-1">Front Status</div>
          <div className="text-xs text-steel-200 leading-relaxed">
            The front line is the boundary between Crimson and Iron territory. Only sectors that <strong>border</strong> the front can be contested. Win one, push it east. Lose one, the line slides west.
          </div>
        </div>
      </div>
    </div>
  );
}

function biomeLabel(b: string) {
  return ({
    ruined_city: 'Ruined Industrial City',
    trench_network: 'Trench Network',
    scorched_farmland: 'Scorched Farmland',
    industrial_yard: 'Industrial Yard',
    frozen_north: 'Frozen North',
    muddy_lowland: 'Muddy Lowland',
  } as any)[b] ?? b;
}

function SectorTile({ sector, color, isCrimson, onHover, onClick }: {
  sector: SectorRow;
  color: string;
  isCrimson: boolean;
  onHover: (inside: boolean) => void;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const x = sector.position_index * (TILE_W + TILE_GAP);
  const h = 0.18 + (sector.battles_won_count % 5) * 0.02;
  const tileColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.85), [color]);
  const emissive = useMemo(() => new THREE.Color(sector.contested ? '#ff4030' : '#000000'), [sector.contested]);

  useFrame(() => {
    if (!ref.current) return;
    if (sector.contested) {
      const t = (Math.sin(performance.now() / 220) + 1) * 0.5;
      ref.current.position.y = 0.04 * t;
    }
  });

  return (
    <group
      ref={ref}
      position={[x, 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = sector.contested ? 'pointer' : 'default'; }}
      onPointerOut={() => { onHover(false); document.body.style.cursor = 'default'; }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[TILE_W, h, 2]} />
        <meshStandardMaterial color={tileColor} emissive={emissive} emissiveIntensity={sector.contested ? 0.45 : 0} roughness={0.85} metalness={0.15} />
      </mesh>
      {sector.contested && (
        <mesh position={[isCrimson ? TILE_W / 2 - 0.02 : -TILE_W / 2 + 0.02, h + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, 1.9]} />
          <meshBasicMaterial color="#ff4030" />
        </mesh>
      )}
      <BiomeDecor biome={sector.biome} y={h + 0.01} />
      {(sector.position_index === 0 || sector.position_index === 49) && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
          <mesh position={[0, h + 0.5, 0]}>
            <coneGeometry args={[0.18, 0.4, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
        </Float>
      )}
      <Html position={[0, h + 0.12, 1.0]} center distanceFactor={6} occlude={false} style={{ pointerEvents: 'none' }}>
        <div className="stencil text-[8px] text-brass-light/80 whitespace-nowrap">
          {sector.position_index}
        </div>
      </Html>
    </group>
  );
}

function BiomeDecor({ biome, y }: { biome: string; y: number }) {
  if (biome === 'ruined_city') {
    return (
      <group position={[0, y, 0]}>
        <mesh position={[-0.18, 0.18, 0.2]} castShadow><boxGeometry args={[0.16, 0.36, 0.16]} /><meshStandardMaterial color="#888" roughness={0.9} /></mesh>
        <mesh position={[0.15, 0.12, -0.2]} castShadow><boxGeometry args={[0.18, 0.24, 0.18]} /><meshStandardMaterial color="#666" roughness={0.9} /></mesh>
        <mesh position={[0.0, 0.06, 0.4]} castShadow><boxGeometry args={[0.12, 0.12, 0.12]} /><meshStandardMaterial color="#777" /></mesh>
      </group>
    );
  }
  if (biome === 'trench_network') {
    return (
      <group position={[0, y, 0]}>
        {[-0.3, 0, 0.3].map((zx, i) => (
          <mesh key={i} position={[zx, 0.02, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.08, 0.04, 1.6]} /><meshStandardMaterial color="#3a3022" roughness={1} /></mesh>
        ))}
        <mesh position={[0, 0.04, 0.4]}><cylinderGeometry args={[0.02, 0.02, 0.6, 6]} /><meshStandardMaterial color="#5a4030" /></mesh>
      </group>
    );
  }
  if (biome === 'scorched_farmland') {
    return (
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[0.95, 1.95]} /><meshStandardMaterial color="#241b10" roughness={1} /></mesh>
        {[-0.3, 0, 0.3].map((zx, i) => (
          <mesh key={i} position={[zx, 0.04, (i % 2 ? 0.4 : -0.4)]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#1a1a14" /></mesh>
        ))}
      </group>
    );
  }
  if (biome === 'industrial_yard') {
    return (
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.05, 0.07, 0.36, 8]} /><meshStandardMaterial color="#999" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[0.25, 0.06, 0]} castShadow><boxGeometry args={[0.2, 0.12, 0.32]} /><meshStandardMaterial color="#666" metalness={0.4} roughness={0.6} /></mesh>
      </group>
    );
  }
  if (biome === 'frozen_north') {
    return (
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[0.95, 1.95]} /><meshStandardMaterial color="#d8e2ec" roughness={1} /></mesh>
        <mesh position={[0.2, 0.08, -0.3]}><coneGeometry args={[0.08, 0.16, 6]} /><meshStandardMaterial color="#243246" /></mesh>
        <mesh position={[-0.2, 0.12, 0.3]}><coneGeometry args={[0.12, 0.24, 6]} /><meshStandardMaterial color="#243246" /></mesh>
      </group>
    );
  }
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[0.95, 1.95]} /><meshStandardMaterial color="#3a2a16" roughness={1} /></mesh>
      <mesh position={[0.1, 0.02, 0.2]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#1f1810" /></mesh>
      <mesh position={[-0.15, 0.02, -0.3]}><sphereGeometry args={[0.07, 6, 6]} /><meshStandardMaterial color="#241a10" /></mesh>
    </group>
  );
}

function FrontLine({ sectors, factions }: { sectors: SectorRow[]; factions: { id: string; slug: string }[] }) {
  const ref = useRef<THREE.Mesh>(null);
  const frontIndex = useMemo(() => {
    if (!sectors.length || !factions.length) return -1;
    const cv = factions.find(f => f.slug === 'crimson_vanguard')?.id;
    for (let i = 0; i < sectors.length - 1; i++) {
      if (sectors[i].owner_faction_id === cv && sectors[i + 1].owner_faction_id !== cv) {
        return i + 1;
      }
    }
    return -1;
  }, [sectors, factions]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  if (frontIndex < 0) return null;
  const x = -TILE_LEN / 2 + frontIndex * (TILE_W + TILE_GAP) - (TILE_W + TILE_GAP) / 2;
  return (
    <mesh ref={ref} position={[x, 0.35, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[0.03, 0.7, 2.2]} />
      <meshBasicMaterial color="#ff4030" transparent opacity={0.85} />
    </mesh>
  );
}

function CapitalMonument({ side, x }: { side: 'crimson' | 'iron'; x: number }) {
  const color = side === 'crimson' ? '#c0392b' : '#7f8c8d';
  return (
    <group position={[x - TILE_LEN / 2, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.3, 1.0, 6]} />
        <meshStandardMaterial color="#1a1a17" metalness={0.6} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.22, 0.4, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
