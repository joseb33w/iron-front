import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Sky, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWarStore } from '../lib/store';
import { supabase, t, rpc } from '../lib/supabase';
import { BattleHUD } from '../components/BattleHUD';
import { generateHeightmap, sampleHeight } from '../game/terrain';
import { Cruiser, CruiserState, makeCruiserBody } from '../game/cruiser';
import { Shell, spawnShell } from '../game/shells';
import { Smoke } from '../game/smoke';
import { isMobile, tierTuning } from '../lib/device';
import { useSettings } from '../lib/settings';
import { TouchControls, RotateHint, useTouchInputState } from '../components/TouchControls';

const BIOME_TUNING: Record<string, { sky: [number, number]; ground: string; mud: number; fog: number }> = {
  ruined_city:        { sky: [0.18, 4],    ground: '#3a3128', mud: 0.0,  fog: 80 },
  trench_network:     { sky: [0.20, 3.5],  ground: '#3b2e1a', mud: 0.35, fog: 70 },
  scorched_farmland:  { sky: [0.50, 6],    ground: '#2a1f12', mud: 0.1,  fog: 95 },
  industrial_yard:    { sky: [0.16, 2.8],  ground: '#383838', mud: 0.0,  fog: 65 },
  frozen_north:       { sky: [0.45, 2.5],  ground: '#c9d3dd', mud: 0.05, fog: 55 },
  muddy_lowland:      { sky: [0.30, 4.5],  ground: '#2c2014', mud: 0.55, fog: 60 },
};

export default function Battle() {
  const { sectorIndex } = useParams();
  const idx = Math.max(0, Math.min(49, parseInt(sectorIndex ?? '24', 10) || 24));
  const navigate = useNavigate();
  const { player, session } = useAuth();
  const { sectors, factions } = useWarStore();
  const tier = useSettings((s) => s.graphicsTier);
  const tuningGfx = useMemo(() => tierTuning(tier), [tier]);
  const mobile = useMemo(() => isMobile(), []);

  const sector = sectors.find((s) => s.position_index === idx);
  const playerFaction = factions.find((f) => f.id === player?.faction_id);

  const [battleId, setBattleId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<null | { winner: 'me' | 'enemy'; result?: any }>(null);
  const [shellInventory, setShellInventory] = useState({ AP: 18, HE: 12, SMOKE: 6 });
  const [selectedShell, setSelectedShell] = useState<'AP' | 'HE' | 'SMOKE'>('AP');
  const [hudLog, setHudLog] = useState<string[]>([]);

  const log = useCallback((line: string) => {
    setHudLog((l) => [...l.slice(-7), line]);
  }, []);

  const touchInput = useTouchInputState();
  const fireRequested = useRef(false);
  const requestFire = useCallback(() => { fireRequested.current = true; }, []);

  useEffect(() => {
    if (!sector || !player || !playerFaction || battleId) return;
    const enemyFaction = factions.find((f) => f.id !== player.faction_id);
    if (!enemyFaction) return;
    const sectorOwner = factions.find((f) => f.id === sector.owner_faction_id);

    const attacking = sectorOwner?.id === player.faction_id ? enemyFaction.id : player.faction_id!;
    const defending = sectorOwner?.id === player.faction_id ? player.faction_id! : enemyFaction.id;

    supabase.from(t('battles')).insert({
      sector_id: sector.id,
      attacking_faction_id: attacking,
      defending_faction_id: defending,
      participants: [{ user_id: player.user_id, callsign: player.callsign, faction_slug: playerFaction.slug }],
    }).select().single().then(({ data, error }) => {
      if (error) {
        log('· field comms down: ' + error.message);
        return;
      }
      setBattleId(data?.id ?? null);
      log('· battle log opened — ' + (sector?.name ?? 'unknown sector'));
    });
  }, [sector, player, playerFaction, factions, battleId, log]);

  const biome = sector?.biome ?? 'trench_network';
  const tuning = BIOME_TUNING[biome] ?? BIOME_TUNING.trench_network;

  const heightmap = useMemo(() => generateHeightmap(64, idx * 7919 + 1), [idx]);

  const reportOutcome = useCallback(async (won: boolean) => {
    if (!battleId || !playerFaction) return;
    const winningSlug = won
      ? playerFaction.slug
      : (factions.find((f) => f.id !== player?.faction_id)?.slug ?? playerFaction.slug);
    try {
      const { data, error } = await supabase.rpc(rpc('resolve_battle'), {
        p_battle_id: battleId,
        p_winning_faction_slug: winningSlug,
      });
      if (error) throw error;
      setOutcome({ winner: won ? 'me' : 'enemy', result: data });
      if (won && player) {
        await supabase.from(t('players'))
          .update({
            cruisers_destroyed: player.cruisers_destroyed + 1,
            kills: player.kills + 1,
          })
          .eq('id', player.id);
      } else if (!won && player) {
        await supabase.from(t('players'))
          .update({ deaths: player.deaths + 1 })
          .eq('id', player.id);
      }
    } catch (e: any) {
      setOutcome({ winner: won ? 'me' : 'enemy', result: { error: e.message } });
    }
  }, [battleId, playerFaction, factions, player]);

  if (!sector) {
    return (
      <div className="m-4 panel panel-rivets p-6 text-center">
        <h2 className="stencil text-brass-light">Sector Not Found</h2>
        <button className="btn-brass mt-3" onClick={() => navigate('/')}>Return</button>
      </div>
    );
  }

  if (!player || !playerFaction) {
    return (
      <div className="m-4 panel panel-rivets p-6 text-center">
        <h2 className="stencil text-brass-light text-xl mb-2">No Service Record</h2>
        <p className="text-steel-200 text-sm mb-3">Enlist before deploying to the front.</p>
        <button className="btn-brass" onClick={() => navigate('/')}>Briefing</button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black battle-root">
      <Canvas
        shadows={tuningGfx.shadowMapSize > 0}
        dpr={[1, tuningGfx.dprMax]}
        gl={{ antialias: tuningGfx.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 65, near: 0.1, far: 800 }}
      >
        <color attach="background" args={[biome === 'frozen_north' ? '#b8c8d5' : '#3a3025']} />
        <fog attach="fog" args={[biome === 'frozen_north' ? '#b8c8d5' : '#5a4a3a', 30, tuning.fog * tuningGfx.fogFarMul]} />
        <Sky
          sunPosition={[100, 18, 60]}
          turbidity={tuning.sky[1]}
          rayleigh={tuning.sky[0]}
          mieCoefficient={0.012}
          mieDirectionalG={0.85}
        />
        <ambientLight intensity={biome === 'frozen_north' ? 0.6 : 0.35} />
        <directionalLight
          position={[80, 90, 30]}
          intensity={biome === 'frozen_north' ? 1.4 : 1.1}
          color={biome === 'frozen_north' ? '#eef5ff' : '#ffcc8a'}
          castShadow={tuningGfx.shadowMapSize > 0}
          shadow-mapSize-width={tuningGfx.shadowMapSize}
          shadow-mapSize-height={tuningGfx.shadowMapSize}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <hemisphereLight args={[biome === 'frozen_north' ? '#cce0ff' : '#ffd8a0', '#1a140e', 0.25]} />

        <Suspense fallback={null}>
          <BattleScene
            heightmap={heightmap}
            biome={biome}
            mudFactor={tuning.mud}
            playerFactionSlug={playerFaction.slug}
            selectedShell={selectedShell}
            shellInventory={shellInventory}
            setShellInventory={setShellInventory}
            log={log}
            onWin={() => reportOutcome(true)}
            onLose={() => reportOutcome(false)}
            outcomeLocked={!!outcome}
            tier={tier}
            touchInput={touchInput}
            fireRequestedRef={fireRequested}
          />
        </Suspense>

        {tuningGfx.bloomEnabled && (
          <EffectComposer>
            <Bloom intensity={0.75} luminanceThreshold={0.6} luminanceSmoothing={0.18} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.85} />
          </EffectComposer>
        )}
      </Canvas>

      <BattleHUD
        sectorName={sector.name}
        sectorIndex={sector.position_index}
        biome={biome}
        factionColor={playerFaction.color}
        factionName={playerFaction.name}
        inventory={shellInventory}
        selectedShell={selectedShell}
        setSelectedShell={setSelectedShell}
        log={hudLog}
        mobile={mobile}
      />

      {mobile && (
        <TouchControls
          onFire={requestFire}
          inventory={shellInventory}
          selectedShell={selectedShell}
          setSelectedShell={setSelectedShell}
          setInput={touchInput.patch}
          consumeAimDeltas={touchInput.consumeAimDeltas}
        />
      )}

      {mobile && <RotateHint />}

      {outcome && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="panel panel-rivets p-8 max-w-md text-center">
            <div className={`stencil text-4xl mb-2 ${outcome.winner === 'me' ? 'text-brass-light' : 'text-crimson-light'}`}>
              {outcome.winner === 'me' ? 'VICTORY' : 'LOSS'}
            </div>
            <div className="text-steel-100 mb-4 text-sm">
              Sector {sector.position_index} — {sector.name}
            </div>
            {outcome.result?.result === 'flipped' && (
              <div className="text-brass-light text-xs mb-3">▸ Front line pushed. Sector flipped.</div>
            )}
            {outcome.result?.result === 'defended' && (
              <div className="text-brass-light text-xs mb-3">▸ Defensive hold. Sector retained.</div>
            )}
            {outcome.result?.result === 'no_flip_not_adjacent' && (
              <div className="text-steel-300 text-xs mb-3">▸ Sector not adjacent to front — no territorial change.</div>
            )}
            {outcome.result?.error && (
              <div className="text-crimson-light text-xs mb-3">▸ Resolution error: {outcome.result.error}</div>
            )}
            <div className="flex gap-2 justify-center">
              <button className="btn-iron" onClick={() => navigate('/warmap')}>War Map</button>
              <button className="btn-crimson" onClick={() => navigate('/')}>Briefing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BattleScene({
  heightmap, biome, mudFactor, playerFactionSlug, selectedShell, shellInventory, setShellInventory,
  log, onWin, onLose, outcomeLocked, tier, touchInput, fireRequestedRef,
}: {
  heightmap: Float32Array;
  biome: string;
  mudFactor: number;
  playerFactionSlug: 'crimson_vanguard' | 'iron_compact';
  selectedShell: 'AP' | 'HE' | 'SMOKE';
  shellInventory: { AP: number; HE: number; SMOKE: number };
  setShellInventory: React.Dispatch<React.SetStateAction<{ AP: number; HE: number; SMOKE: number }>>;
  log: (s: string) => void;
  onWin: () => void;
  onLose: () => void;
  outcomeLocked: boolean;
  tier: 'low' | 'medium' | 'high';
  touchInput: ReturnType<typeof useTouchInputState>;
  fireRequestedRef: React.MutableRefObject<boolean>;
}) {
  const camRef = useRef<THREE.PerspectiveCamera>(null);

  const playerState = useRef<CruiserState>({
    pos: new THREE.Vector3(0, 1, 8),
    yaw: Math.PI,
    turretYaw: 0,
    turretPitch: 0,
    speed: 0,
    hp: 100,
    immobilized: false,
    tracksOk: true,
    color: playerFactionSlug === 'crimson_vanguard' ? '#7a1f17' : '#34495e',
    accent: playerFactionSlug === 'crimson_vanguard' ? '#c0392b' : '#7f8c8d',
    callsign: 'YOU',
  });

  const enemyState = useRef<CruiserState>({
    pos: new THREE.Vector3(0, 1, -22),
    yaw: 0,
    turretYaw: 0,
    turretPitch: 0,
    speed: 0,
    hp: 100,
    immobilized: false,
    tracksOk: true,
    color: playerFactionSlug === 'crimson_vanguard' ? '#34495e' : '#7a1f17',
    accent: playerFactionSlug === 'crimson_vanguard' ? '#7f8c8d' : '#c0392b',
    callsign: 'ENEMY',
  });

  const world = useRef<CANNON.World>(null!);
  const playerBody = useRef<CANNON.Body>(null!);
  const enemyBody = useRef<CANNON.Body>(null!);
  const [shells, setShells] = useState<Shell[]>([]);
  const [smokes, setSmokes] = useState<{ id: number; pos: THREE.Vector3; t: number }[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const w = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    w.broadphase = new CANNON.NaiveBroadphase();
    w.allowSleep = true;
    world.current = w;

    playerBody.current = makeCruiserBody(playerState.current.pos);
    enemyBody.current = makeCruiserBody(enemyState.current.pos);
    w.addBody(playerBody.current);
    w.addBody(enemyBody.current);
  }, []);

  // Keyboard input. Pointer Events are handled in TouchControls.
  // Desktop keeps WASD/QE/RF/Space; mobile additionally drives the same
  // input ref through the touch-input ref + fireRequestedRef.
  const input = useRef({
    fwd: 0, turn: 0, turretTurn: 0, turretPitch: 0, fire: false,
  });

  useEffect(() => {
    const down: Record<string, boolean> = {};
    const onKD = (e: KeyboardEvent) => { down[e.code] = true; updateInput(); };
    const onKU = (e: KeyboardEvent) => { down[e.code] = false; updateInput(); };
    const updateInput = () => {
      input.current.fwd = (down['KeyW'] || down['ArrowUp'] ? 1 : 0) - (down['KeyS'] || down['ArrowDown'] ? 1 : 0);
      input.current.turn = (down['KeyA'] || down['ArrowLeft'] ? 1 : 0) - (down['KeyD'] || down['ArrowRight'] ? 1 : 0);
      input.current.turretTurn = (down['KeyQ'] ? 1 : 0) - (down['KeyE'] ? 1 : 0);
      input.current.turretPitch = (down['KeyR'] ? 1 : 0) - (down['KeyF'] ? 1 : 0);
      input.current.fire = !!down['Space'];
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    return () => { window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU); };
  }, []);

  const lastFire = useRef(0);
  const lastEnemyFire = useRef(0);
  const enemyAiState = useRef<{ moveT: number; dir: number }>({ moveT: 0, dir: 1 });

  useFrame((state, dt) => {
    if (outcomeLocked) return;
    dt = Math.min(dt, 0.05);

    world.current?.step(1 / 60, dt, 3);

    // Merge touch input over keyboard input. fwd / turn are absolute on
    // touch (joystick), so they overwrite keyboard contributions when the
    // joystick is engaged. Turret yaw/pitch from touch are deltas drained
    // here and applied below.
    const touchFwd = touchInput.state.fwd;
    const touchTurn = touchInput.state.turn;
    const effFwd  = Math.abs(touchFwd)  > 0.001 ? touchFwd  : input.current.fwd;
    const effTurn = Math.abs(touchTurn) > 0.001 ? touchTurn : input.current.turn;

    if (!playerState.current.immobilized) {
      const accel = 6 * (1 - mudFactor * 0.55);
      const maxSpeed = 9 * (1 - mudFactor * 0.4);
      playerState.current.speed += effFwd * accel * dt;
      playerState.current.speed *= 0.985;
      playerState.current.speed = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, playerState.current.speed));
      const turnRate = 1.1 * (Math.abs(playerState.current.speed) > 0.5 ? 1 : 0.4);
      playerState.current.yaw += effTurn * turnRate * dt;
    } else {
      playerState.current.speed *= 0.85;
    }
    playerState.current.pos.x += Math.sin(playerState.current.yaw) * playerState.current.speed * dt;
    playerState.current.pos.z += Math.cos(playerState.current.yaw) * playerState.current.speed * dt;
    const py = sampleHeight(heightmap, playerState.current.pos.x, playerState.current.pos.z);
    playerState.current.pos.y = py + 0.7;

    // Turret slew: keyboard contribution + drained touch deltas.
    playerState.current.turretYaw += input.current.turretTurn * 1.5 * dt;
    playerState.current.turretPitch += input.current.turretPitch * 0.6 * dt;
    const aim = touchInput.consumeAimDeltas();
    playerState.current.turretYaw += aim.yaw;
    playerState.current.turretPitch += aim.pitch;
    playerState.current.turretPitch = Math.max(-0.05, Math.min(0.45, playerState.current.turretPitch));

    const wantsFire = input.current.fire || fireRequestedRef.current;
    if (fireRequestedRef.current) fireRequestedRef.current = false;
    if (wantsFire && state.clock.elapsedTime - lastFire.current > 1.2 && shellInventory[selectedShell] > 0) {
      lastFire.current = state.clock.elapsedTime;
      const origin = playerState.current.pos.clone().add(new THREE.Vector3(0, 0.6, 0));
      const dirYaw = playerState.current.yaw + playerState.current.turretYaw;
      const muzzleOffset = new THREE.Vector3(Math.sin(dirYaw) * 2.8, 0, Math.cos(dirYaw) * 2.8);
      origin.add(muzzleOffset);
      const speed = selectedShell === 'AP' ? 95 : selectedShell === 'HE' ? 75 : 55;
      const vel = new THREE.Vector3(
        Math.sin(dirYaw) * Math.cos(playerState.current.turretPitch) * speed,
        Math.sin(playerState.current.turretPitch) * speed + 2,
        Math.cos(dirYaw) * Math.cos(playerState.current.turretPitch) * speed
      );
      vel.x += (Math.random() - 0.5) * 1.5;
      const id = nextId.current++;
      setShells((s) => [...s, spawnShell(id, origin, vel, selectedShell)]);
      setShellInventory((inv) => ({ ...inv, [selectedShell]: inv[selectedShell] - 1 }));
      log(`▸ FIRE ${selectedShell} — bearing ${(((dirYaw * 180) / Math.PI) % 360 + 360 % 360).toFixed(0)}°`);
    }

    enemyAiState.current.moveT += dt;
    if (enemyAiState.current.moveT > 3.5) {
      enemyAiState.current.moveT = 0;
      enemyAiState.current.dir = Math.random() > 0.5 ? 1 : -1;
    }
    if (!enemyState.current.immobilized) {
      enemyState.current.speed = 2.5;
      enemyState.current.yaw += enemyAiState.current.dir * 0.4 * dt;
      enemyState.current.pos.x += Math.sin(enemyState.current.yaw) * enemyState.current.speed * dt;
      enemyState.current.pos.z += Math.cos(enemyState.current.yaw) * enemyState.current.speed * dt;
      const toP = playerState.current.pos.clone().sub(enemyState.current.pos);
      if (toP.length() > 38) {
        enemyState.current.yaw = Math.atan2(toP.x, toP.z);
      }
    }
    enemyState.current.pos.y = sampleHeight(heightmap, enemyState.current.pos.x, enemyState.current.pos.z) + 0.7;
    const dx = playerState.current.pos.x - enemyState.current.pos.x;
    const dz = playerState.current.pos.z - enemyState.current.pos.z;
    const desiredYaw = Math.atan2(dx, dz) - enemyState.current.yaw;
    enemyState.current.turretYaw += (desiredYaw - enemyState.current.turretYaw) * 1.2 * dt;
    enemyState.current.turretPitch = Math.atan2(playerState.current.pos.y - enemyState.current.pos.y, Math.hypot(dx, dz)) + 0.1;

    if (state.clock.elapsedTime - lastEnemyFire.current > 3.2 + Math.random() * 2 && !enemyState.current.immobilized) {
      lastEnemyFire.current = state.clock.elapsedTime;
      const origin = enemyState.current.pos.clone().add(new THREE.Vector3(0, 0.6, 0));
      const dirYaw = enemyState.current.yaw + enemyState.current.turretYaw;
      origin.add(new THREE.Vector3(Math.sin(dirYaw) * 2.8, 0, Math.cos(dirYaw) * 2.8));
      const vel = new THREE.Vector3(
        Math.sin(dirYaw) * Math.cos(enemyState.current.turretPitch) * 85,
        Math.sin(enemyState.current.turretPitch) * 85 + 1.5,
        Math.cos(dirYaw) * Math.cos(enemyState.current.turretPitch) * 85
      );
      const id = nextId.current++;
      setShells((s) => [...s, spawnShell(id, origin, vel, 'AP', true)]);
    }

    setShells((arr) => {
      const next: Shell[] = [];
      for (const sh of arr) {
        sh.vel.y -= 9.82 * dt;
        sh.vel.x += sh.windX * dt;
        sh.pos.add(sh.vel.clone().multiplyScalar(dt));
        sh.lifetime += dt;
        const groundY = sampleHeight(heightmap, sh.pos.x, sh.pos.z);
        if (sh.pos.y <= groundY + 0.05 || sh.lifetime > 6) {
          spawnSmoke(sh.pos.clone(), 1.0);
          continue;
        }
        const target = sh.hostile ? playerState.current : enemyState.current;
        const d = sh.pos.distanceTo(target.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
        if (d < 1.5) {
          const shooterPos = sh.hostile ? enemyState.current.pos : playerState.current.pos;
          const impactN = sh.pos.clone().sub(target.pos).normalize();
          (async () => {
            const armor = 80;
            try {
              const { data, error } = await supabase.rpc(rpc('validate_hit'), {
                p_battle_id: null,
                p_shooter_pos: { x: shooterPos.x, y: shooterPos.y, z: shooterPos.z },
                p_target_pos: { x: target.pos.x, y: target.pos.y, z: target.pos.z },
                p_impact_normal: { x: impactN.x, y: impactN.y, z: impactN.z },
                p_shell_velocity: { x: sh.vel.x, y: sh.vel.y, z: sh.vel.z },
                p_shell_type: sh.type,
                p_armor_thickness: armor,
              });
              if (!error && data) {
                applyDamage(data.outcome, data.damage, sh.hostile);
              } else {
                applyLocalDamage(impactN, sh.vel, sh.type, armor, sh.hostile);
              }
            } catch {
              applyLocalDamage(impactN, sh.vel, sh.type, armor, sh.hostile);
            }
          })();
          spawnSmoke(sh.pos.clone(), 2.0);
          continue;
        }
        next.push(sh);
      }
      return next;
    });

    setSmokes((arr) => arr.map((s) => ({ ...s, t: s.t + dt })).filter((s) => s.t < 3.2));

    if (camRef.current) {
      const cam = camRef.current;
      const turretYaw = playerState.current.yaw + playerState.current.turretYaw;
      const back = new THREE.Vector3(-Math.sin(turretYaw) * 7, 4, -Math.cos(turretYaw) * 7);
      const target = playerState.current.pos.clone().add(back);
      cam.position.lerp(target, 0.12);
      const lookAt = playerState.current.pos.clone().add(new THREE.Vector3(0, 1.1, 0));
      cam.lookAt(lookAt);
    }
  });

  const spawnSmoke = (p: THREE.Vector3, _scale: number) => {
    setSmokes((arr) => [...arr, { id: nextId.current++, pos: p, t: 0 }]);
  };

  const applyDamage = (outcome: string, dmg: number, toPlayer: boolean) => {
    if (outcome === 'ricochet') { log(`· RICOCHET — shallow angle`); return; }
    if (outcome === 'bounce')   { log(`· BOUNCED — armor held`); return; }
    if (outcome === 'penetration') {
      if (toPlayer) {
        playerState.current.hp -= dmg;
        log(`! HIT TAKEN — penetration ${dmg.toFixed(0)} dmg`);
        if (playerState.current.hp <= 0 && !outcomeLocked) onLose();
        if (playerState.current.hp <= 30 && playerState.current.tracksOk && Math.random() < 0.25) {
          playerState.current.immobilized = true;
          playerState.current.tracksOk = false;
          log(`!! TRACKS BLOWN — immobilized`);
        }
      } else {
        enemyState.current.hp -= dmg;
        log(`✓ HIT CONFIRMED — penetration ${dmg.toFixed(0)} dmg`);
        if (enemyState.current.hp <= 0 && !outcomeLocked) onWin();
        else if (enemyState.current.hp <= 35 && enemyState.current.tracksOk && Math.random() < 0.3) {
          enemyState.current.immobilized = true;
          enemyState.current.tracksOk = false;
          log(`✓ ENEMY IMMOBILIZED`);
        }
      }
    }
  };

  const applyLocalDamage = (impactN: THREE.Vector3, vel: THREE.Vector3, type: string, armorMm: number, toPlayer: boolean) => {
    const v = vel.clone().normalize();
    const dot = Math.abs(v.dot(impactN));
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const angleDeg = (angle * 180) / Math.PI;
    if (angleDeg > 70) { applyDamage('ricochet', 0, toPlayer); return; }
    const effective = armorMm / Math.max(Math.cos(angle), 0.05);
    const pen = type === 'AP' ? 160 : type === 'HE' ? 50 : 0;
    if (pen < effective) { applyDamage('bounce', 0, toPlayer); return; }
    const dmg = Math.min(100, 25 + (pen - effective) * 0.5) + (type === 'HE' ? 15 : 0);
    applyDamage('penetration', dmg, toPlayer);
  };

  const ruinsCount = tierTuning(tier).ruinsCount;

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 6, 18]} />
      <Terrain heightmap={heightmap} biome={biome} mud={mudFactor} groundColor={BIOME_TUNING[biome].ground} />
      <RuinsField biome={biome} count={biome === 'frozen_north' ? Math.round(ruinsCount * 0.5) : ruinsCount} />
      <SodiumLamps />
      <Cruiser stateRef={playerState} isPlayer />
      <Cruiser stateRef={enemyState} />
      {shells.map((sh) => (<ShellMesh key={sh.id} shell={sh} />))}
      {smokes.map((s) => (<Smoke key={s.id} pos={s.pos} t={s.t} tier={tier} />))}
    </>
  );
}

function Terrain({ heightmap, biome, mud, groundColor }: {
  heightmap: Float32Array;
  biome: string;
  mud: number;
  groundColor: string;
}) {
  const N = 64;
  const SIZE = 120;
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const u = Math.floor(((x + SIZE / 2) / SIZE) * (N - 1));
      const v = Math.floor(((z + SIZE / 2) / SIZE) * (N - 1));
      const h = heightmap[v * N + u];
      pos.setY(i, h);

      const slopeApprox = i % N > 0 ? Math.abs(h - heightmap[v * N + (u - 1)]) : 0;
      const c = new THREE.Color();
      if (biome === 'frozen_north') {
        c.set('#dde8f1').lerp(new THREE.Color('#4a566a'), slopeApprox * 4);
      } else if (biome === 'scorched_farmland') {
        c.set('#1f1810').lerp(new THREE.Color('#3a2a18'), Math.min(1, h * 0.3 + slopeApprox * 4));
      } else {
        c.set(groundColor).lerp(new THREE.Color('#1a120a'), Math.min(1, slopeApprox * 6 + mud * 0.4));
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [heightmap, biome, groundColor, mud]);

  return (
    <mesh geometry={geom} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={1.0 - mud * 0.3} metalness={0.0} />
    </mesh>
  );
}

function RuinsField({ biome, count }: { biome: string; count: number }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; type: string; rot: number; scale: number; color: string }[] = [];
    let seed = 1234;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 90;
      const z = (rnd() - 0.5) * 90;
      if (Math.hypot(x, z) < 12) continue;
      const types = biome === 'ruined_city'
        ? ['wall', 'wall', 'column', 'corner', 'pipe', 'block']
        : biome === 'industrial_yard'
          ? ['pipe', 'pipe', 'block', 'wall']
          : biome === 'frozen_north'
            ? ['stump', 'stump', 'block', 'wall']
            : ['stump', 'block', 'wall', 'pipe'];
      const type = types[Math.floor(rnd() * types.length)];
      const color = biome === 'frozen_north' ? '#3a4452' : biome === 'industrial_yard' ? '#404040' : ['#4a3a2a', '#3a2e22', '#544432', '#3a3027'][Math.floor(rnd() * 4)];
      out.push({ pos: [x, 0, z], type, rot: rnd() * Math.PI * 2, scale: 0.6 + rnd() * 1.4, color });
    }
    return out;
  }, [biome, count]);

  return (
    <group>
      {items.map((it, i) => (
        <RuinModule key={i} {...it} />
      ))}
    </group>
  );
}

function RuinModule({ pos, type, rot, scale, color }: { pos: [number, number, number]; type: string; rot: number; scale: number; color: string }) {
  return (
    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
      {type === 'wall' && (
        <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
          <boxGeometry args={[2.4, 2.4, 0.4]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      )}
      {type === 'column' && (
        <mesh castShadow receiveShadow position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 3.2, 8]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      )}
      {type === 'corner' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
            <boxGeometry args={[2.4, 2.4, 0.4]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh castShadow receiveShadow position={[1.0, 1.0, 1.0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.6, 2.0, 0.4]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
        </group>
      )}
      {type === 'pipe' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 2.4, 10]} />
            <meshStandardMaterial color="#8a7050" metalness={0.7} roughness={0.6} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.5, 0.8, 0.5]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </group>
      )}
      {type === 'block' && (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1.0, 1.0, 1.0]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      )}
      {type === 'stump' && (
        <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.5, 0.7, 0.8, 6]} />
          <meshStandardMaterial color="#241b10" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

function SodiumLamps() {
  const lamps = useMemo(() => {
    const arr: { x: number; z: number }[] = [];
    let seed = 4242;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 8; i++) {
      arr.push({ x: (rnd() - 0.5) * 70, z: (rnd() - 0.5) * 70 });
    }
    return arr;
  }, []);
  return (
    <group>
      {lamps.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh castShadow position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 3.6, 6]} />
            <meshStandardMaterial color="#222" metalness={0.5} roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 3.4, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#ffae3a" emissive="#ffae3a" emissiveIntensity={2.8} />
          </mesh>
          <pointLight position={[0.3, 3.4, 0]} intensity={1.2} distance={12} color="#ffb86b" />
        </group>
      ))}
    </group>
  );
}

function ShellMesh({ shell }: { shell: Shell }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.copy(shell.pos);
    ref.current.lookAt(shell.pos.clone().add(shell.vel));
  });
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.45, 6]} />
        <meshStandardMaterial
          color={shell.type === 'AP' ? '#d4af6a' : shell.type === 'HE' ? '#ff6020' : '#aaa'}
          emissive={shell.type === 'AP' ? '#ffcc66' : shell.type === 'HE' ? '#ff5020' : '#fff'}
          emissiveIntensity={1.6}
        />
      </mesh>
      <pointLight intensity={shell.type === 'AP' ? 1.5 : 1} distance={6} color="#ffaa44" />
    </group>
  );
}
