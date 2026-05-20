import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import Tank from './Tank';
import Bunker from './Bunker';
import World from './World';
import {
  BUNKER_RADIUS,
  BUNKER_RESPAWN,
  FIRE_COOLDOWN,
  SHELL_LIFETIME,
  SHELL_SPEED,
  TANK_REVERSE,
  TANK_SPEED,
  TANK_TURN,
  WORLD_HALF,
  bunkerSideZ,
  forwardVec,
  generateBunkerRow,
  spawnHeading,
  spawnZForPlayer,
  trenchZ,
} from './gameState';

// drive state lives in a ref so we don't re-render the canvas on input
function useInput() {
  const stateRef = useRef({
    forward: 0,    // -1..1
    turn: 0,       // -1..1
    fire: false,
    fireEdge: false, // single-fire latch each press
  });

  useEffect(() => {
    const keys = new Set();
    const update = () => {
      const s = stateRef.current;
      s.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      s.turn = (keys.has('a') || keys.has('arrowleft') ? 1 : 0) - (keys.has('d') || keys.has('arrowright') ? 1 : 0);
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
    // forward direction (local +X) in world after Y-rotation by h: (cos h, 0, -sin h)
    const fx = Math.cos(h);
    const fz = -Math.sin(h);
    // camera sits behind the tank (opposite of forward)
    tmp.set(t.position.x - fx * chaseDist, chaseHeight, t.position.z - fz * chaseDist);
    camera.position.lerp(tmp, 0.12);
    tmp2.copy(t.position).add(lookOffset);
    camera.lookAt(tmp2);
  });

  return null;
}

function Scene({ player, front, onKill, inputRef, onPlayerStateChange, mobileInputRef, onDebug }) {
  const shellsFiredRef = useRef(0);
  const tankGroupRef = useRef();
  const turretAngleRef = useRef(0);
  const [shells, setShells] = useState([]);
  const shellsRef = useRef(shells);
  shellsRef.current = shells;
  const cooldownRef = useRef(0);

  const [bunkerSeed, setBunkerSeed] = useState(0);
  const [bunkers, setBunkers] = useState(() => generateBunkerRow(front.position, player.faction, 0));

  // when front line shifts a lot, regenerate bunker row positions
  const lastFrontRef = useRef(front.position);
  useEffect(() => {
    if (Math.abs(front.position - lastFrontRef.current) > 0.02) {
      lastFrontRef.current = front.position;
      setBunkerSeed((s) => s + 1);
      setBunkers(generateBunkerRow(front.position, player.faction, bunkerSeed + 1));
    }
  }, [front.position, player.faction, bunkerSeed]);

  // initialize tank position
  useEffect(() => {
    if (tankGroupRef.current) {
      tankGroupRef.current.position.set(0, 0, spawnZForPlayer(player.faction));
      tankGroupRef.current.rotation.y = spawnHeading(player.faction);
    }
  }, [player.faction]);

  // GAME LOOP
  useFrame((_state, dt) => {
    const tank = tankGroupRef.current;
    if (!tank) return;

    const i = inputRef.current;
    const m = mobileInputRef.current;

    // combine keyboard + mobile
    const forward = Math.max(-1, Math.min(1, i.forward + m.forward));
    const turn = Math.max(-1, Math.min(1, i.turn + m.turn));

    // turn
    tank.rotation.y += turn * TANK_TURN * dt;

    // move (forward unit vector in world from heading)
    const speed = forward >= 0 ? forward * TANK_SPEED : forward * TANK_REVERSE;
    const fwd = forwardVec(tank.rotation.y);
    tank.position.x += fwd.x * speed * dt;
    tank.position.z += fwd.z * speed * dt;

    // soft world bounds
    tank.position.x = Math.max(-WORLD_HALF - 30, Math.min(WORLD_HALF + 30, tank.position.x));
    tank.position.z = Math.max(-WORLD_HALF - 80, Math.min(WORLD_HALF + 80, tank.position.z));

    // emit pose for hud aim
    onPlayerStateChange?.({
      x: tank.position.x,
      z: tank.position.z,
      heading: tank.rotation.y,
    });

    // cooldown
    if (cooldownRef.current > 0) cooldownRef.current -= dt;

    // 1) advance existing shells + drop expired
    const now = performance.now() / 1000;
    const moved = [];
    for (const s of shellsRef.current) {
      const t = s.t + dt;
      if (t >= SHELL_LIFETIME) continue;
      moved.push({ ...s, t, x: s.x + s.vx * dt, z: s.z + s.vz * dt });
    }

    // 2) maybe spawn a new shell (edge-triggered)
    if ((i.fireEdge || m.fireEdge) && cooldownRef.current <= 0) {
      i.fireEdge = false;
      m.fireEdge = false;
      cooldownRef.current = FIRE_COOLDOWN;
      const muzzleDist = 3.0;
      const fwd = forwardVec(tank.rotation.y);
      moved.push({
        id: Math.random().toString(36).slice(2),
        x: tank.position.x + fwd.x * muzzleDist,
        y: 1.2,
        z: tank.position.z + fwd.z * muzzleDist,
        vx: fwd.x * SHELL_SPEED,
        vz: fwd.z * SHELL_SPEED,
        t: 0,
      });
      shellsFiredRef.current += 1;
      onDebug?.({ shellsFired: shellsFiredRef.current });
    } else {
      i.fireEdge = false;
      m.fireEdge = false;
    }

    // 3) collision check vs bunkers
    const aliveBunkers = bunkers;
    const surviving = [];
    const killedIndices = [];
    for (const s of moved) {
      let hit = false;
      for (let bi = 0; bi < aliveBunkers.length; bi++) {
        const b = aliveBunkers[bi];
        if (!b.alive) continue;
        const dx = s.x - b.x;
        const dz = s.z - b.z;
        if (dx * dx + dz * dz <= BUNKER_RADIUS * BUNKER_RADIUS) {
          hit = true;
          killedIndices.push(bi);
          break;
        }
      }
      if (!hit) surviving.push(s);
    }

    if (surviving.length !== shellsRef.current.length || moved.length !== shellsRef.current.length) {
      setShells(surviving);
      onDebug?.({ shellsAlive: surviving.length });
    }

    if (killedIndices.length > 0) {
      const next = aliveBunkers.map((b, bi) => {
        if (killedIndices.includes(bi)) {
          return { ...b, alive: false, respawnAt: now + BUNKER_RESPAWN };
        }
        return b;
      });
      setBunkers(next);
      for (const bi of killedIndices) {
        const b = aliveBunkers[bi];
        onKill(b.x, b.z);
      }
    }

    // bunker respawns
    let anyRespawn = false;
    const respawned = aliveBunkers.map((b) => {
      if (!b.alive && b.respawnAt > 0 && now >= b.respawnAt) {
        anyRespawn = true;
        return { ...b, alive: true, respawnAt: 0 };
      }
      return b;
    });
    if (anyRespawn) setBunkers(respawned);

    // turret slight bob (purely cosmetic)
    turretAngleRef.current = Math.sin(now * 0.6) * 0.04;
  });

  const enemyFaction = player.faction === 'iron' ? 'steam' : 'iron';

  return (
    <>
      {/* lighting + atmosphere */}
      <fog attach="fog" args={['#0c0a08', 60, 180]} />
      <hemisphereLight args={['#3a2818', '#0a0805', 0.7]} />
      <directionalLight
        position={[40, 60, 20]}
        intensity={1.0}
        color={'#f5d28b'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <pointLight position={[0, 8, trenchZ(front.position)]} intensity={0.6} color={'#d4953a'} distance={50} />

      <World frontPosition={front.position} />

      {/* enemy bunkers */}
      {bunkers.map((b) => (
        <Bunker key={b.id} x={b.x} z={b.z} alive={b.alive} enemyFaction={enemyFaction} />
      ))}

      {/* shells */}
      {shells.map((s) => (
        <mesh key={s.id} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial
            color="#fff7c2"
            emissive="#ffb858"
            emissiveIntensity={2.4}
          />
        </mesh>
      ))}

      {/* player tank */}
      <group ref={tankGroupRef}>
        <Tank faction={player.faction} turretAngle={turretAngleRef.current} />
      </group>

      <ChaseCamera targetRef={tankGroupRef} />
    </>
  );
}

export default function Game({ player, front, onKill }) {
  const inputRef = useInput();
  const mobileInputRef = useRef({ forward: 0, turn: 0, fireEdge: false });
  const [hudPose, setHudPose] = useState({ x: 0, z: 0, heading: 0 });
  const [toast, setToast] = useState(null);
  const [debug, setDebug] = useState({ shellsFired: 0, shellsAlive: 0, killCount: 0 });

  // expose mobile control setters
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

  function handleKill(x, z) {
    setToast(`Bunker destroyed!`);
    setTimeout(() => setToast(null), 1900);
    setDebug((d) => ({ ...d, killCount: d.killCount + 1 }));
    onKill(x, z);
  }

  function handleDebug(patch) {
    setDebug((d) => ({ ...d, ...patch }));
  }

  return (
    <div className="game-root" data-testid="game-root">
      <Canvas
        className="game-canvas"
        shadows
        dpr={[1, 1.7]}
        camera={{ fov: 55, near: 0.5, far: 400, position: [0, 9, -14] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0c0a08']} />
        <Scene
          player={player}
          front={front}
          onKill={handleKill}
          inputRef={inputRef}
          onPlayerStateChange={setHudPose}
          mobileInputRef={mobileInputRef}
          onDebug={handleDebug}
        />
      </Canvas>
      {toast && <div className="toast" data-testid="kill-toast">{toast}</div>}
      {/* hud pose is intentionally consumed elsewhere */}
      <input type="hidden" data-testid="player-x" value={Math.round(hudPose.x)} readOnly />
      <input type="hidden" data-testid="player-z" value={Math.round(hudPose.z)} readOnly />
      <input type="hidden" data-testid="player-heading" value={hudPose.heading.toFixed(3)} readOnly />
      <input type="hidden" data-testid="shells-fired" value={debug.shellsFired} readOnly />
      <input type="hidden" data-testid="shells-alive" value={debug.shellsAlive} readOnly />
      <input type="hidden" data-testid="kill-count" value={debug.killCount} readOnly />
    </div>
  );
}
