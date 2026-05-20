import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Detailed dieselpunk tank with PBR-ish materials, riveted plates, exhaust stacks
// that smoke a bit, faction-lit lamps, and a turret that bobs subtly.
export default function Tank({ faction = 'iron', hp = 100, maxHp = 100, equippedWeapon = null, treadPhase = 0 }) {
  const palette = useMemo(() => (
    faction === 'iron'
      ? { hull: '#8a6336', armor: '#3a2818', trim: '#f5b85a', glass: '#fff0c4', detail: '#b07d3a' }
      : { hull: '#356a76', armor: '#143846', trim: '#7ce4f5', glass: '#cef4fb', detail: '#4d96a8' }
  ), [faction]);

  const turretRef = useRef();
  const exhaustL = useRef();
  const exhaustR = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (turretRef.current) turretRef.current.rotation.y = Math.sin(t * 0.6) * 0.03;
    const pulse = 0.6 + Math.sin(t * 8) * 0.2;
    if (exhaustL.current?.material) exhaustL.current.material.emissiveIntensity = pulse * 0.4;
    if (exhaustR.current?.material) exhaustR.current.material.emissiveIntensity = pulse * 0.4;
  });

  const hpPct = Math.max(0, Math.min(1, hp / maxHp));
  const isDual = equippedWeapon === 'wpn_dual';
  const isMissile = equippedWeapon === 'wpn_missile';

  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.8, 2.6]} />
        <meshStandardMaterial color={palette.armor} roughness={0.85} metalness={0.45} />
      </mesh>
      <mesh position={[0.2, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.45, 2.0]} />
        <meshStandardMaterial color={palette.hull} roughness={0.55} metalness={0.65} />
      </mesh>
      <mesh position={[1.6, 0.9, 0]} rotation={[0, 0, -0.55]} castShadow>
        <boxGeometry args={[1.0, 0.18, 2.05]} />
        <meshStandardMaterial color={palette.hull} roughness={0.55} metalness={0.7} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6, 1.0].map((x, i) => (
        <mesh key={i} position={[x, 1.3, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={palette.detail} roughness={0.4} metalness={0.9} />
        </mesh>
      ))}
      {[-1.3, 1.3].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.42, z]} castShadow>
            <boxGeometry args={[3.9, 0.78, 0.5]} />
            <meshStandardMaterial color="#1a1208" roughness={0.95} metalness={0.18} />
          </mesh>
          <mesh position={[1.7, 0.45, z]} rotation={[0, 0, treadPhase * 0.4]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.55, 12]} />
            <meshStandardMaterial color="#2a1d10" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[-1.7, 0.45, z]} rotation={[0, 0, treadPhase * -0.4]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.55, 12]} />
            <meshStandardMaterial color="#2a1d10" roughness={0.7} metalness={0.6} />
          </mesh>
          {[-1.2, -0.6, 0.0, 0.6, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 0.35, z]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.6, 10]} />
              <meshStandardMaterial color="#0e0805" roughness={0.85} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1.3, 1.3].map((z) => (
        <mesh key={z} position={[0, 0.85, z]} castShadow>
          <boxGeometry args={[3.7, 0.06, 0.55]} />
          <meshStandardMaterial color={palette.detail} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}
      <group ref={turretRef} position={[0.15, 1.35, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.95, 1.1, 0.7, 16]} />
          <meshStandardMaterial color={palette.hull} roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <sphereGeometry args={[0.78, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={palette.hull} roughness={0.55} metalness={0.7} />
        </mesh>
        <mesh position={[-0.35, 0.4, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.12, 12]} />
          <meshStandardMaterial color={palette.armor} roughness={0.75} metalness={0.5} />
        </mesh>
        <mesh position={[0.55, 0.18, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.4, 0.18, 0.7]} />
          <meshStandardMaterial color={palette.glass} emissive={palette.glass} emissiveIntensity={0.35} roughness={0.15} metalness={0.1} />
        </mesh>
        <mesh position={[0.95, 0, 0]} castShadow>
          <boxGeometry args={[0.55, 0.55, 0.85]} />
          <meshStandardMaterial color={palette.armor} roughness={0.55} metalness={0.85} />
        </mesh>
        {isDual ? (
          <>
            <Barrel offsetZ={-0.32} palette={palette} length={2.8} />
            <Barrel offsetZ={0.32} palette={palette} length={2.8} />
          </>
        ) : (
          <Barrel offsetZ={0} palette={palette} length={isMissile ? 2.4 : 2.9} thick={isMissile} />
        )}
        <mesh position={[0.95, 0.4, 0]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color={palette.trim} emissive={palette.trim} emissiveIntensity={2.4} />
        </mesh>
      </group>
      <mesh ref={exhaustL} position={[-1.6, 1.45, -0.7]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 1.1, 10]} />
        <meshStandardMaterial color="#1a1208" roughness={0.95} emissive="#ff5520" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={exhaustR} position={[-1.6, 1.45, 0.7]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 1.1, 10]} />
        <meshStandardMaterial color="#1a1208" roughness={0.95} emissive="#ff5520" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.55, 1.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 1.5]} />
        <meshStandardMaterial color={palette.armor} roughness={0.9} metalness={0.4} />
      </mesh>
      {[-0.85, 0.85].map((z) => (
        <mesh key={z} position={[1.85, 0.95, z]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#fff0b0" emissive="#fff0b0" emissiveIntensity={2.6} />
        </mesh>
      ))}
      <group position={[0, 3.2, 0]}>
        <mesh>
          <planeGeometry args={[2.4, 0.18]} />
          <meshBasicMaterial color="#000" opacity={0.55} transparent />
        </mesh>
        <mesh position={[(-2.4 * (1 - hpPct)) / 2, 0, 0.001]}>
          <planeGeometry args={[2.4 * hpPct, 0.16]} />
          <meshBasicMaterial color={hpPct > 0.55 ? '#7cf07a' : hpPct > 0.25 ? '#ffcb50' : '#ff5a3d'} />
        </mesh>
      </group>
    </group>
  );
}

function Barrel({ offsetZ = 0, palette, length = 2.8, thick = false }) {
  const r = thick ? 0.22 : 0.13;
  const r2 = thick ? 0.26 : 0.155;
  return (
    <group position={[0, 0, offsetZ]}>
      <mesh position={[length / 2 + 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r2, length, 12]} />
        <meshStandardMaterial color={palette.armor} roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[length + 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.4, 12]} />
        <meshStandardMaterial color={palette.trim} roughness={0.3} metalness={0.95} emissive={palette.trim} emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}
