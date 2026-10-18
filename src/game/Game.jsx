import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import Tank from './Tank';
import Bunker from './Bunker';
import World from './World';
import TankActor from './TankActor';
import Explosion from './Explosion';
import {
  AI_DAMAGE,
  AI_MAX_HP,
  AI_SHELL_RADIUS,
  BUNKER_RADIUS,
  BUNKER_RESPAWN,
  MORTAR_COOLDOWN,
  MORTAR_DAMAGE,
  MORTAR_DIRECT_HIT_Y,
  MORTAR_GRAVITY,
  MORTAR_IMPACT_Y,
  MORTAR_LAUNCH_LIFT,
  MORTAR_LIFETIME,
  MORTAR_MUZZLE_Y,
  MORTAR_SPLASH,
  PLAYER_MAX_HP,
  PLAYER_SHELL_DAMAGE,
  SHELL_LIFETIME,
  SHELL_SPEED,
  TANK_REVERSE,
  TANK_SPEED,
  TANK_TURN,
  WORLD_HALF,
  forwardVec,
  generateAiTanks,
  generateBunkerRow,
  mortarAim,
  spawnHeading,
  spawnZForPlayer,
} from './gameState';
import { stepAi } from './ai';

function useInput() {
  const stateRef = useRef({ forward: 0, turn: 0, fire: false, fireEdge: false });

  useEffect(() => {
    const keys = new Set();
    const update = () => {
      const s = stateRef.current;
      s.forward =
        (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      s.turn =
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0) -
        (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    };
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','space'].includes(k)) {
        e.preventDefault();
      }
      keys.add(k);
      if (k === ' ' || k === 'space') {
        stateRef.current.fire = true;
        stateRef.current.fireEdge = true;
      }
      update();
    };
    const onUp = (e) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (k === ' ' || k === 'space') stateRef.current.fire = false;
      update();
    };
    const onBlur = () => { keys.clear(); update(); stateRef.current.fire = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return stateRef;
}

function ChaseCamera({ targetRef }) {
  const { camera } = useThree();
  const chaseDist = 14;
  const chaseHeight = 9;
  const lookOffset = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!targetRef.current) return;
    const t = targetRef.current;
    const h = t.rotation.y;
    const fx = Math.cos(h);
    const fz = -Math.sin(h);
    tmp.set(t.position.x - fx * chaseDist, chaseHeight, t.position.z - fz * chaseDist);
    camera.position.lerp(tmp, 0.12);
    tmp2.copy(t.position).add(lookOffset);
    camera.lookAt(tmp2);
  });

  return null;
}

function WorldSun({ world }) {
  return (
    <>
      <ambientLight intensity={world.ambient} color={world.skyColor} />
      <hemisphereLight args={[world.skyColor, world.ground.color, 0.6]} />
      <directionalLight
        position={[60, 80, 30]}
        intensity={world.sunIntensity}
        color={world.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-near={0.5}
        shadow-camera-far={300}
        shadow-bias={-0.0003}
      />
      <pointLight position={[0, 6, 0]} intensity={1.2} color={world.accent} distance={70} decay={1.5} />
    </>
  );
}

function MortarRound({ shell }) {
  const speed = Math.hypot(shell.vx, shell.vy, shell.vz) || 1;
  const dx = shell.vx / speed;
  const dy = shell.vy / speed;
  const dz = shell.vz / speed;
  const pitch = Math.asin(Math.max(-1, Math.min(1, dy)));
  const yaw = Math.atan2(-dz, dx);
  return (
    <group position={[shell.x, shell.y, shell.z]} rotation={[0, yaw, pitch]}>
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <capsuleGeometry args={[0.3, 0.7, 4, 10]} />
        <meshStandardMaterial color="#3a2818" roughness={0.6} metalness={0.8} />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fff2c0" emissive="#ffa33d" emissiveIntensity={3.5} />
      </mesh>
      {[0.9, 1.5, 2.1].map((d, i) => (
        <mesh key={i} position={[-d, 0, 0]}>
          <sphereGeometry args={[0.26 - i * 0.05, 8, 8]} />
          <meshBasicMaterial color="#d9c6a8" transparent opacity={0.45 - i * 0.12} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  player,
  front,
  world,
  effects,
  onKillBunker,
  onKillAi,
  onPlayerDeath,
  inputRef,
  onPlayerStateChange,
  mobileInputRef,
  onDebug,
  onShellCount,
  onReloadChange,
  remotePlayers,
  alive,
}) {
  const tankGroupRef = useRef();
  const [shells, setShells] = useState([]);
  const shellsRef = useRef(shells); shellsRef.current = shells;

  const [aiShells, setAiShells] = useState([]);
  const aiShellsRef = useRef(aiShells); aiShellsRef.current = aiShells;

  const cooldownRef = useRef(0);
  const reloadingRef = useRef(false);
  const isMortar = effects.weaponMode === 'mortar';
  const fireCooldown = isMortar ? MORTAR_COOLDOWN : effects.fireCooldown;
  const shellsPerShot = effects.shellsPerShot;
  const shellRadius = isMortar ? Math.max(MORTAR_SPLASH, effects.shellDamageRadius) : effects.shellDamageRadius;
  const equippedWeapon = isMortar ? 'wpn_mortar' : shellsPerShot > 1 ? 'wpn_dual' : shellRadius > 0 ? 'wpn_missile' : null;
  const damageOutMul = effects.damageOutMul;
  const damageInMul = effects.damageMul;
  const speedMul = effects.speedMul;
  const turnMul = effects.turnMul;

  const [bunkers, setBunkers] = useState(() => generateBunkerRow(front.position, player.faction, 0));
  const bunkersRef = useRef(bunkers); bunkersRef.current = bunkers;
  const [aiTanks, setAiTanks] = useState(() => generateAiTanks(front.position, player.faction, 0));
  const aiTanksRef = useRef(aiTanks); aiTanksRef.current = aiTanks;
  const [explosions, setExplosions] = useState([]);
  const shellsFiredRef = useRef(0);
  const bunkerHitsRef = useRef(0);
  const aiHitsRef = useRef(0);

  const lastFrontRef = useRef(front.position);
  useEffect(() => {
    if (Math.abs(front.position - lastFrontRef.current) > 0.02) {
      lastFrontRef.current = front.position;
      setBunkers(generateBunkerRow(front.position, player.faction, Math.floor(front.position * 100)));
      setAiTanks(generateAiTanks(front.position, player.faction, Math.floor(front.position * 100)));
    }
  }, [front.position, player.faction]);

  useEffect(() => {
    if (tankGroupRef.current) {
      tankGroupRef.current.position.set(0, 0, spawnZForPlayer(player.faction));
      tankGroupRef.current.rotation.y = spawnHeading(player.faction);
    }
  }, [player.faction, world.id]);

  const prevAliveRef = useRef(alive);
  useEffect(() => {
    if (alive && !prevAliveRef.current && tankGroupRef.current) {
      tankGroupRef.current.position.set(0, 0, spawnZForPlayer(player.faction));
      tankGroupRef.current.rotation.y = spawnHeading(player.faction);
    }
    prevAliveRef.current = alive;
  }, [alive, player.faction]);

  const treadPhaseRef = useRef(0);
  const heatRef = useRef(0);

  useFrame((state, dt) => {
    const tank = tankGroupRef.current;
    if (!tank) return;

    const now = state.clock.elapsedTime;
    const i = inputRef.current;
    const m = mobileInputRef.current;

    if (alive) {
      const forward = Math.max(-1, Math.min(1, i.forward + m.forward));
      const turn = Math.max(-1, Math.min(1, i.turn + m.turn));

      tank.rotation.y += turn * TANK_TURN * turnMul * dt;

      const speed = forward >= 0 ? forward * TANK_SPEED * speedMul : forward * TANK_REVERSE;
      const fwd = forwardVec(tank.rotation.y);
      tank.position.x += fwd.x * speed * dt;
      tank.position.z += fwd.z * speed * dt;

      tank.position.x = Math.max(-WORLD_HALF - 30, Math.min(WORLD_HALF + 30, tank.position.x));
      tank.position.z = Math.max(-WORLD_HALF - 80, Math.min(WORLD_HALF + 80, tank.position.z));

      treadPhaseRef.current += Math.abs(speed) * dt * 1.2;

      onPlayerStateChange?.({ x: tank.position.x, z: tank.position.z, heading: tank.rotation.y });

      if (cooldownRef.current > 0) cooldownRef.current -= dt;
    } else {
      if (cooldownRef.current > 0) cooldownRef.current -= dt;
    }

    // === advance + collide player shells (substepped so high-speed shells can't
    // tunnel through small targets when frame rate is low) ===
    const survivingPlayerShells = [];
    const bunkerHits = [];
    const aiHits = [];
    const newExplosions = [];

    const bunkersNow = bunkersRef.current;
    const aiTanksNow = aiTanksRef.current;

    const shellPool = [];
    for (const s of shellsRef.current) shellPool.push({ ...s });

    if (alive && (i.fireEdge || m.fireEdge) && cooldownRef.current <= 0) {
      i.fireEdge = false;
      m.fireEdge = false;
      cooldownRef.current = fireCooldown;
      const fwd = forwardVec(tank.rotation.y);
      const aim = isMortar
        ? mortarAim(tank.position, fwd, [...bunkersNow.filter((b) => b.alive), ...aiTanksNow.filter((a) => a.alive)])
        : null;
      const dir = aim ? aim.dir : fwd;
      const px = -dir.z;
      const pz = dir.x;
      for (let k = 0; k < shellsPerShot; k++) {
        const offset = shellsPerShot === 1 ? 0 : (k - (shellsPerShot - 1) / 2) * (isMortar ? 2.5 : 0.6);
        if (isMortar) {
          shellPool.push({
            id: Math.random().toString(36).slice(2),
            kind: 'mortar',
            x: tank.position.x + px * offset,
            y: MORTAR_MUZZLE_Y,
            z: tank.position.z + pz * offset,
            vx: dir.x * aim.speed,
            vy: MORTAR_LAUNCH_LIFT,
            vz: dir.z * aim.speed,
            t: 0,
          });
        } else {
          shellPool.push({
            id: Math.random().toString(36).slice(2),
            kind: 'cannon',
            x: tank.position.x + fwd.x * 3 + px * offset,
            y: 1.25,
            z: tank.position.z + fwd.z * 3 + pz * offset,
            vx: fwd.x * SHELL_SPEED,
            vz: fwd.z * SHELL_SPEED,
            t: 0,
          });
        }
      }
      shellsFiredRef.current += shellsPerShot;
      onDebug?.({ shellsFired: shellsFiredRef.current, mortarLocked: aim ? aim.locked : false });
    } else {
      i.fireEdge = false;
      m.fireEdge = false;
    }

    const reloading = cooldownRef.current > 0;
    if (reloading !== reloadingRef.current) {
      reloadingRef.current = reloading;
      onReloadChange?.(reloading);
    }

    const stepMax = 0.6 / SHELL_SPEED;
    const N = Math.max(1, Math.ceil(dt / stepMax));
    const sub = dt / N;

    const detonateMortar = (sx, sy, sz) => {
      newExplosions.push({ id: Math.random().toString(36).slice(2), x: sx, y: Math.max(0.8, sy), z: sz, color: '#ffa33d', size: 1.9, startedAt: now });
      const bunkerReach = BUNKER_RADIUS + shellRadius;
      for (let bi = 0; bi < bunkersNow.length; bi++) {
        const b = bunkersNow[bi];
        if (!b.alive || bunkerHits.includes(bi)) continue;
        const dx = sx - b.x, dz = sz - b.z;
        if (dx * dx + dz * dz <= bunkerReach * bunkerReach) bunkerHits.push(bi);
      }
      const tankReach = 2.2 + shellRadius;
      for (let ai = 0; ai < aiTanksNow.length; ai++) {
        const a = aiTanksNow[ai];
        if (!a.alive) continue;
        const d = Math.hypot(sx - a.x, sz - a.z);
        if (d > tankReach) continue;
        const falloff = d <= 3 ? 1 : 1 - ((d - 3) / (tankReach - 3)) * 0.5;
        aiHits.push([ai, MORTAR_DAMAGE * falloff * damageOutMul]);
      }
    };

    for (const s of shellPool) {
      let hit = false;
      let t = s.t;
      let sx = s.x;
      let sz = s.z;
      if (s.kind === 'mortar') {
        let sy = s.y;
        let vy = s.vy;
        for (let n = 0; n < N && !hit; n++) {
          t += sub;
          if (t >= MORTAR_LIFETIME) { hit = true; break; }
          sx += s.vx * sub;
          sz += s.vz * sub;
          vy -= MORTAR_GRAVITY * sub;
          sy += vy * sub;
          if (sy <= MORTAR_IMPACT_Y) {
            detonateMortar(sx, MORTAR_IMPACT_Y, sz);
            hit = true;
            break;
          }
          if (vy < 0 && sy <= MORTAR_DIRECT_HIT_Y) {
            for (let bi = 0; bi < bunkersNow.length && !hit; bi++) {
              const b = bunkersNow[bi];
              if (!b.alive) continue;
              const dx = sx - b.x, dz = sz - b.z;
              if (dx * dx + dz * dz <= BUNKER_RADIUS * BUNKER_RADIUS) {
                detonateMortar(sx, sy, sz);
                hit = true;
              }
            }
            for (let ai = 0; ai < aiTanksNow.length && !hit; ai++) {
              const a = aiTanksNow[ai];
              if (!a.alive) continue;
              const dx = sx - a.x, dz = sz - a.z;
              if (dx * dx + dz * dz <= 2.2 * 2.2) {
                detonateMortar(sx, sy, sz);
                hit = true;
              }
            }
          }
        }
        if (!hit) survivingPlayerShells.push({ ...s, t, x: sx, y: sy, z: sz, vy });
        continue;
      }
      for (let n = 0; n < N && !hit; n++) {
        t += sub;
        if (t >= SHELL_LIFETIME) { hit = true; break; }
        sx += s.vx * sub;
        sz += s.vz * sub;
        for (let bi = 0; bi < bunkersNow.length; bi++) {
          const b = bunkersNow[bi];
          if (!b.alive) continue;
          const dx = sx - b.x, dz = sz - b.z;
          if (dx * dx + dz * dz <= BUNKER_RADIUS * BUNKER_RADIUS) {
            bunkerHits.push(bi);
            newExplosions.push({ id: Math.random().toString(36).slice(2), x: b.x, y: 1.5, z: b.z, color: '#ffb858', startedAt: now });
            hit = true;
            break;
          }
        }
        if (hit) break;
        for (let ai = 0; ai < aiTanksNow.length; ai++) {
          const a = aiTanksNow[ai];
          if (!a.alive) continue;
          const dx = sx - a.x, dz = sz - a.z;
          const r = 2.2 + shellRadius;
          if (dx * dx + dz * dz <= r * r) {
            aiHits.push([ai, PLAYER_SHELL_DAMAGE * damageOutMul]);
            newExplosions.push({ id: Math.random().toString(36).slice(2), x: a.x, y: 1.5, z: a.z, color: '#ff7a3d', startedAt: now });
            if (shellRadius > 0) {
              for (let ai2 = 0; ai2 < aiTanksNow.length; ai2++) {
                if (ai2 === ai) continue;
                const a2 = aiTanksNow[ai2];
                if (!a2.alive) continue;
                const ddx = sx - a2.x, ddz = sz - a2.z;
                if (ddx * ddx + ddz * ddz <= shellRadius * shellRadius) {
                  aiHits.push([ai2, PLAYER_SHELL_DAMAGE * 0.6 * damageOutMul]);
                }
              }
            }
            hit = true;
            break;
          }
        }
      }
      if (!hit) survivingPlayerShells.push({ ...s, t, x: sx, z: sz });
    }
    shellsRef.current = survivingPlayerShells;
    setShells(survivingPlayerShells);
    onShellCount?.(survivingPlayerShells.length, survivingPlayerShells.reduce((m, sh) => Math.max(m, sh.y), 0));

    if (aiHits.length > 0) {
      aiHitsRef.current += aiHits.length;
      onDebug?.({ aiHits: aiHitsRef.current });
    }

    const playerPose = { x: tank.position.x, z: tank.position.z };
    const newAiShells = [];
    const stepped = aiTanksNow.map((a) => {
      if (!a.alive) {
        if (a.respawnAt > 0 && now >= a.respawnAt) {
          return { ...a, alive: true, hp: AI_MAX_HP, respawnAt: 0 };
        }
        return a;
      }
      const out = stepAi(a, dt, alive ? playerPose : { x: 9999, z: 9999 }, now);
      if (out.shell) newAiShells.push({ id: Math.random().toString(36).slice(2), ...out.shell });
      return out.ai;
    });

    let aiDirty = aiHits.length > 0 || newAiShells.length > 0 || stepped.some((a, i) => a !== aiTanksNow[i]);
    const afterHits = stepped.map((a, idx) => {
      let hp = a.hp;
      for (const [hidx, dmg] of aiHits) if (hidx === idx) hp -= dmg;
      if (a.alive && hp <= 0) {
        onKillAi?.(a.x, a.z);
        return { ...a, alive: false, hp: 0, respawnAt: now + 5.0 };
      }
      return { ...a, hp };
    });

    // === advance + collide AI shells vs player (substepped) ===
    const movedAiShells = [];
    let playerHitDamage = 0;
    const aiShellPool = [...aiShellsRef.current, ...newAiShells];
    for (const s of aiShellPool) {
      let hit = false;
      let t = s.t;
      let sx = s.x;
      let sz = s.z;
      const stepMax2 = 0.6 / 55;
      const N2 = Math.max(1, Math.ceil(dt / stepMax2));
      const sub2 = dt / N2;
      for (let n = 0; n < N2 && !hit; n++) {
        t += sub2;
        if (t >= SHELL_LIFETIME) { hit = true; break; }
        sx += s.vx * sub2;
        sz += s.vz * sub2;
        if (alive) {
          const dx = sx - tank.position.x;
          const dz = sz - tank.position.z;
          if (dx * dx + dz * dz <= AI_SHELL_RADIUS * AI_SHELL_RADIUS + 4) {
            playerHitDamage += AI_DAMAGE;
            newExplosions.push({ id: Math.random().toString(36).slice(2), x: sx, y: 1.5, z: sz, color: '#ff5a3d', startedAt: now });
            hit = true;
            break;
          }
        }
      }
      if (!hit) movedAiShells.push({ ...s, t, x: sx, z: sz });
    }
    aiShellsRef.current = movedAiShells;
    setAiShells(movedAiShells);

    if (aiDirty) {
      aiTanksRef.current = afterHits;
      setAiTanks(afterHits);
    }

    if (bunkerHits.length > 0) {
      const newBunkers = bunkersNow.map((b, bi) => bunkerHits.includes(bi) ? { ...b, alive: false, respawnAt: now + BUNKER_RESPAWN } : b);
      bunkersRef.current = newBunkers;
      setBunkers(newBunkers);
      for (const bi of bunkerHits) {
        const b = bunkersNow[bi];
        onKillBunker(b.x, b.z);
      }
      bunkerHitsRef.current += bunkerHits.length;
      onDebug?.({ bunkerHits: bunkerHitsRef.current });
    }

    let anyRespawn = false;
    const respawned = bunkersRef.current.map((b) => {
      if (!b.alive && b.respawnAt > 0 && now >= b.respawnAt) {
        anyRespawn = true;
        return { ...b, alive: true, respawnAt: 0 };
      }
      return b;
    });
    if (anyRespawn) {
      bunkersRef.current = respawned;
      setBunkers(respawned);
    }

    if (newExplosions.length > 0) {
      setExplosions((prev) => [...prev.filter((e) => now - e.startedAt < 0.7), ...newExplosions]);
    } else if (explosions.length > 0) {
      const stillAlive = explosions.filter((e) => now - e.startedAt < 0.7);
      if (stillAlive.length !== explosions.length) setExplosions(stillAlive);
    }

    if (playerHitDamage > 0) {
      onPlayerDeath?.(playerHitDamage * damageInMul, 'damage');
      heatRef.current = 4;
    } else {
      heatRef.current = Math.max(0, heatRef.current - dt);
      if (effects.autoRepair > 0 && heatRef.current <= 0) {
        onPlayerDeath?.(-effects.autoRepair * dt, 'repair');
      }
    }
  });

  const enemyFaction = player.faction === 'iron' ? 'steam' : 'iron';

  return (
    <>
      <WorldSun world={world} />
      <World frontPosition={front.position} world={world} />

      {bunkers.map((b) => (
        <Bunker key={b.id} x={b.x} z={b.z} alive={b.alive} enemyFaction={enemyFaction} />
      ))}

      {aiTanks.map((a) => (
        a.alive ? (
          <TankActor
            key={a.id}
            targetX={a.x}
            targetZ={a.z}
            targetHeading={a.heading}
            faction={a.faction}
            hp={a.hp}
            maxHp={AI_MAX_HP}
            callsign="ENEMY"
            fast
          />
        ) : null
      ))}

      {remotePlayers.map((r) => (
        <TankActor
          key={r.key}
          targetX={r.x}
          targetZ={r.z}
          targetHeading={r.heading}
          faction={r.faction}
          hp={r.hp ?? 100}
          maxHp={PLAYER_MAX_HP}
          callsign={r.callsign}
        />
      ))}

      {shells.map((s) => (
        s.kind === 'mortar' ? (
          <MortarRound key={s.id} shell={s} />
        ) : (
          <mesh key={s.id} position={[s.x, s.y, s.z]}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshStandardMaterial color="#fff7c2" emissive="#ffb858" emissiveIntensity={3.2} />
          </mesh>
        )
      ))}

      {aiShells.map((s) => (
        <mesh key={s.id} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#ffd6c4" emissive="#ff5a3d" emissiveIntensity={3.2} />
        </mesh>
      ))}

      {explosions.map((e) => (
        <Explosion key={e.id} x={e.x} y={e.y} z={e.z} color={e.color} size={e.size} startedAt={e.startedAt} />
      ))}

      <group ref={tankGroupRef}>
        {alive && <Tank faction={player.faction} hp={100} maxHp={PLAYER_MAX_HP} equippedWeapon={equippedWeapon} treadPhase={treadPhaseRef.current} />}
      </group>

      <ChaseCamera targetRef={tankGroupRef} />
    </>
  );
}

export default function Game({
  player,
  front,
  world,
  effects,
  onKillBunker,
  onKillAi,
  onPlayerDeath,
  remotePlayers,
  alive,
  hp,
  scrap,
  onPoseUpdate,
  onReloadChange,
}) {
  const inputRef = useInput();
  const mobileInputRef = useRef({ forward: 0, turn: 0, fireEdge: false });
  const [debug, setDebug] = useState({ shellsFired: 0, killCount: 0 });
  const [pose, setPose] = useState({ x: 0, z: 0, heading: 0 });
  const [shellCount, setShellCount] = useState(0);
  const [shellPeakY, setShellPeakY] = useState(0);

  useEffect(() => {
    window.__ironMobile = {
      setMove(forward, turn) {
        const m = mobileInputRef.current;
        m.forward = forward;
        m.turn = turn;
      },
      fire() {
        mobileInputRef.current.fireEdge = true;
      },
    };
    return () => { delete window.__ironMobile; };
  }, []);

  const handleDebug = (patch) => setDebug((d) => ({ ...d, ...patch }));
  const handlePose = (p) => { setPose(p); onPoseUpdate?.(p); };
  const handleShellCount = (n, peakY) => { setShellCount(n); setShellPeakY(peakY); };

  return (
    <div className="game-root" data-testid="game-root">
      <Canvas
        className="game-canvas"
        shadows
        dpr={[1, 1.8]}
        camera={{ fov: 55, near: 0.5, far: 500, position: [0, 9, -14] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      >
        <color attach="background" args={[world.skyColor]} />
        <Scene
          player={player}
          front={front}
          world={world}
          effects={effects}
          onKillBunker={onKillBunker}
          onKillAi={onKillAi}
          onPlayerDeath={onPlayerDeath}
          inputRef={inputRef}
          mobileInputRef={mobileInputRef}
          onPlayerStateChange={handlePose}
          onDebug={handleDebug}
          onShellCount={handleShellCount}
          onReloadChange={onReloadChange}
          remotePlayers={remotePlayers}
          alive={alive}
        />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.65} luminanceThreshold={0.7} luminanceSmoothing={0.2} />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      <input type="hidden" data-testid="player-x" value={Math.round(pose.x)} readOnly />
      <input type="hidden" data-testid="player-z" value={Math.round(pose.z)} readOnly />
      <input type="hidden" data-testid="player-heading" value={pose.heading.toFixed(3)} readOnly />
      <input type="hidden" data-testid="shells-fired" value={debug.shellsFired || 0} readOnly />
      <input type="hidden" data-testid="bunker-hits" value={debug.bunkerHits || 0} readOnly />
      <input type="hidden" data-testid="ai-hits" value={debug.aiHits || 0} readOnly />
      <input type="hidden" data-testid="shell-count" value={shellCount} readOnly />
      <input type="hidden" data-testid="shell-peak-y" value={shellPeakY.toFixed(2)} readOnly />
      <input type="hidden" data-testid="mortar-locked" value={debug.mortarLocked ? '1' : '0'} readOnly />
      <input type="hidden" data-testid="player-hp" value={hp} readOnly />
      <input type="hidden" data-testid="player-scrap" value={scrap} readOnly />
      <input type="hidden" data-testid="player-alive" value={alive ? '1' : '0'} readOnly />
    </div>
  );
}
