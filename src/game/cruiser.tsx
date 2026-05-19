import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MutableRefObject } from 'react';

export type CruiserState = {
  pos: THREE.Vector3;
  yaw: number;
  turretYaw: number;
  turretPitch: number;
  speed: number;
  hp: number;
  immobilized: boolean;
  tracksOk: boolean;
  color: string;
  accent: string;
  callsign: string;
};

export function makeCruiserBody(pos: THREE.Vector3): CANNON.Body {
  const shape = new CANNON.Box(new CANNON.Vec3(2.0, 1.0, 3.4));
  const body = new CANNON.Body({ mass: 22000, shape, type: CANNON.Body.KINEMATIC });
  body.position.set(pos.x, pos.y, pos.z);
  return body;
}

export function Cruiser({ stateRef, isPlayer = false }: {
  stateRef: MutableRefObject<CruiserState>;
  isPlayer?: boolean;
}) {
  const hull = useRef<THREE.Group>(null);
  const turret = useRef<THREE.Group>(null);
  const barrel = useRef<THREE.Group>(null);
  const recoilT = useRef(0);
  const lastFire = useRef(0);
  const smokeRef = useRef<THREE.Mesh>(null);
  const treadL = useRef<THREE.Mesh>(null);
  const treadR = useRef<THREE.Mesh>(null);
  const treadOffset = useRef(0);

  useFrame((state, dt) => {
    if (!hull.current || !turret.current || !barrel.current) return;
    const s = stateRef.current;
    hull.current.position.copy(s.pos);
    hull.current.rotation.y = s.yaw;
    turret.current.rotation.y = s.turretYaw;
    barrel.current.rotation.x = -s.turretPitch;

    // tread offset animation
    treadOffset.current += s.speed * dt * 4.0;
    if (treadL.current && treadR.current) {
      const mat = treadL.current.material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map.offset.x = treadOffset.current;
      }
    }

    // exhaust smoke pulse from stacks
    if (smokeRef.current) {
      const t = state.clock.elapsedTime;
      const sc = 0.5 + Math.sin(t * 3 + (isPlayer ? 0 : 0.7)) * 0.15 + Math.abs(s.speed) * 0.05;
      smokeRef.current.scale.setScalar(sc);
      (smokeRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.abs(s.speed) * 0.05;
    }
  });

  return (
    <group ref={hull}>
      {/* main hull */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[3.6, 1.0, 5.4]} />
        <meshStandardMaterial color={stateRef.current.color} metalness={0.5} roughness={0.55} />
      </mesh>
      {/* glacis plate (sloped front) */}
      <mesh castShadow position={[0, 0.55, 2.6]} rotation={[-Math.PI / 4, 0, 0]}>
        <boxGeometry args={[3.4, 1.4, 0.18]} />
        <meshStandardMaterial color={stateRef.current.color} metalness={0.5} roughness={0.55} />
      </mesh>
      {/* rivet rows */}
      <RivetRow start={[-1.6, 0.92, 1.0]} end={[1.6, 0.92, 1.0]} count={9} />
      <RivetRow start={[-1.6, 0.92, -1.0]} end={[1.6, 0.92, -1.0]} count={9} />
      {/* tread housings */}
      {[1.85, -1.85].map((x, i) => (
        <mesh key={i} ref={i === 0 ? treadL : treadR} castShadow position={[x, 0, 0]}>
          <boxGeometry args={[0.45, 0.7, 5.4]} />
          <meshStandardMaterial color="#1a1a17" roughness={0.95} metalness={0.2} />
        </mesh>
      ))}
      {/* tread links (decorative) */}
      {[1.85, -1.85].map((x, side) => (
        <group key={`treads-${side}`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[x, 0.0, -2.5 + i * 0.42]} castShadow>
              <boxGeometry args={[0.5, 0.12, 0.34]} />
              <meshStandardMaterial color="#2a2620" metalness={0.4} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* turret group (yaws) */}
      <group ref={turret} position={[0, 1.0, 0]}>
        {/* turret main */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.35, 0.7, 12]} />
          <meshStandardMaterial color={stateRef.current.color} metalness={0.55} roughness={0.5} />
        </mesh>
        {/* brass band */}
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[1.3, 0.06, 8, 24]} />
          <meshStandardMaterial color="#b08d57" metalness={0.9} roughness={0.35} />
        </mesh>
        {/* commander hatch */}
        <mesh castShadow position={[-0.55, 0.5, 0.2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.18, 10]} />
          <meshStandardMaterial color="#1a1a17" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* periscope */}
        <mesh position={[-0.55, 0.75, 0.2]}>
          <boxGeometry args={[0.08, 0.32, 0.18]} />
          <meshStandardMaterial color="#33291a" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* MG mount */}
        <mesh position={[0.55, 0.45, 0.4]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
          <meshStandardMaterial color="#222" metalness={0.7} />
        </mesh>
        {/* barrel group (pitches) */}
        <group ref={barrel} position={[0, 0.0, 1.0]}>
          {/* mantlet */}
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.7, 0.5]} />
            <meshStandardMaterial color={stateRef.current.color} metalness={0.5} roughness={0.55} />
          </mesh>
          {/* barrel */}
          <mesh castShadow position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 2.8, 10]} />
            <meshStandardMaterial color="#1a1a17" metalness={0.7} roughness={0.45} />
          </mesh>
          {/* muzzle brake */}
          <mesh castShadow position={[0, 0, 2.85]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.3, 10]} />
            <meshStandardMaterial color="#0e0e0c" metalness={0.7} roughness={0.5} />
          </mesh>
        </group>
      </group>
      {/* exhaust stacks venting black smoke */}
      {[ -1.5, 1.5 ].map((x, i) => (
        <group key={i} position={[x, 1.0, -2.4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.16, 0.6, 8]} />
            <meshStandardMaterial color="#1a1409" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh ref={i === 0 ? smokeRef : undefined} position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color="#1a1a17" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {/* callsign decal */}
      <mesh position={[1.81, 0.55, -1.5]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[1.4, 0.32]} />
        <meshBasicMaterial color={stateRef.current.accent} opacity={0.85} transparent />
      </mesh>
      {/* HP bar above */}
      <HpBar stateRef={stateRef} />
    </group>
  );
}

function HpBar({ stateRef }: { stateRef: MutableRefObject<CruiserState> }) {
  const bar = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (!bar.current) return;
    bar.current.lookAt(camera.position);
    const w = Math.max(0, stateRef.current.hp / 100) * 2.0;
    (bar.current.scale as THREE.Vector3).set(w, 1, 1);
  });
  return (
    <group position={[0, 2.6, 0]}>
      <mesh>
        <planeGeometry args={[2.0, 0.12]} />
        <meshBasicMaterial color="#1a1a17" />
      </mesh>
      <mesh ref={bar} position={[0, 0, 0.001]} scale={[2, 1, 1]}>
        <planeGeometry args={[1.0, 0.1]} />
        <meshBasicMaterial color="#c0392b" />
      </mesh>
    </group>
  );
}

function RivetRow({ start, end, count }: { start: [number, number, number]; end: [number, number, number]; count: number }) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const p = a.clone().lerp(b, i / (count - 1));
        return (
          <mesh key={i} position={p.toArray()}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color="#b08d57" metalness={0.85} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}
