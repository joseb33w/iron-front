import { useMemo } from 'react';

export default function Bunker({ x, z, enemyFaction, alive }) {
  const palette = useMemo(() => (
    enemyFaction === 'iron'
      ? { wall: '#6e5436', trim: '#d4953a', flag: '#d4953a' }
      : { wall: '#2e5a64', trim: '#4ac4d6', flag: '#4ac4d6' }
  ), [enemyFaction]);

  if (!alive) {
    // rubble
    return (
      <group position={[x, 0, z]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[(i - 1.5) * 0.7, 0.25, Math.sin(i) * 0.5]} rotation={[Math.sin(i), i, Math.cos(i)]}>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
            <meshStandardMaterial color="#2a1d10" roughness={1} />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.6, 16]} />
          <meshStandardMaterial color="#0a0805" roughness={1} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      {/* main bunker block */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 2.2, 3.2]} />
        <meshStandardMaterial color={palette.wall} roughness={0.9} metalness={0.2} />
      </mesh>
      {/* roof slab */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[3.6, 0.25, 3.6]} />
        <meshStandardMaterial color="#1a1208" roughness={0.95} />
      </mesh>
      {/* gun slit (front, glowing) */}
      <mesh position={[0, 1.4, 1.62]}>
        <boxGeometry args={[2.0, 0.3, 0.05]} />
        <meshStandardMaterial color={palette.trim} emissive={palette.trim} emissiveIntensity={0.9} />
      </mesh>
      {/* sandbags around base */}
      {[[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx, 0.35, sz]} castShadow>
          <boxGeometry args={[1.2, 0.7, 1.2]} />
          <meshStandardMaterial color="#3a2a18" roughness={1} />
        </mesh>
      ))}
      {/* faction flag pole */}
      <mesh position={[1.5, 3.5, 1.5]}>
        <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
        <meshStandardMaterial color="#1a1208" />
      </mesh>
      <mesh position={[1.95, 4.1, 1.5]}>
        <boxGeometry args={[0.9, 0.55, 0.02]} />
        <meshStandardMaterial color={palette.flag} side={2} />
      </mesh>
    </group>
  );
}
