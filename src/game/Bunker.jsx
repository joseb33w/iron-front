import { useMemo } from 'react';

export default function Bunker({ x, z, enemyFaction, alive }) {
  const palette = useMemo(() => (
    enemyFaction === 'iron'
      ? { wall: '#9a7e58', trim: '#f5b85a', flag: '#f5b85a' }
      : { wall: '#3e7886', trim: '#7ce4f5', flag: '#7ce4f5' }
  ), [enemyFaction]);

  if (!alive) {
    return (
      <group position={[x, 0, z]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(i - 2) * 0.7, 0.25 + (i % 2) * 0.1, Math.sin(i * 1.3) * 0.6]} rotation={[Math.sin(i), i, Math.cos(i)]} castShadow>
            <boxGeometry args={[0.9, 0.5 + (i % 3) * 0.1, 0.9]} />
            <meshStandardMaterial color="#3a2a1c" roughness={1} />
          </mesh>
        ))}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 24]} />
          <meshStandardMaterial color="#1a1208" roughness={1} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshBasicMaterial color="#2a2018" transparent opacity={0.45} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.8, 4.0]} />
        <meshStandardMaterial color="#594331" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 2.0, 3.2]} />
        <meshStandardMaterial color={palette.wall} roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[3.6, 0.3, 3.6]} />
        <meshStandardMaterial color="#1a1208" roughness={0.95} />
      </mesh>
      <mesh position={[0.8, 2.85, 0.8]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.7, 8]} />
        <meshStandardMaterial color="#1a1208" roughness={0.9} metalness={0.5} />
      </mesh>
      {[
        [0, 1.5, 1.62, 0],
        [0, 1.5, -1.62, Math.PI],
        [1.62, 1.5, 0, Math.PI / 2],
        [-1.62, 1.5, 0, -Math.PI / 2],
      ].map(([sx, sy, sz, ry], i) => (
        <mesh key={i} position={[sx, sy, sz]} rotation={[0, ry, 0]}>
          <boxGeometry args={[2.0, 0.32, 0.06]} />
          <meshStandardMaterial color={palette.trim} emissive={palette.trim} emissiveIntensity={1.4} />
        </mesh>
      ))}
      {[[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].map(([sx, sz], i) => (
        <group key={i} position={[sx, 0, sz]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.4, 0.6, 1.4]} />
            <meshStandardMaterial color="#3a2a1c" roughness={1} />
          </mesh>
          <mesh position={[0, 0.75, 0]} rotation={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.2, 0.4, 1.2]} />
            <meshStandardMaterial color="#46341f" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[1.5, 4.0, 1.5]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 3.0, 8]} />
        <meshStandardMaterial color="#1a1208" roughness={0.9} metalness={0.4} />
      </mesh>
      <mesh position={[2.05, 4.7, 1.5]} castShadow>
        <boxGeometry args={[1.05, 0.65, 0.04]} />
        <meshStandardMaterial color={palette.flag} side={2} emissive={palette.flag} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}
