import { useMemo } from 'react';
import * as THREE from 'three';

export default function Tank({ faction, position = [0, 0, 0], heading = 0, turretAngle = 0 }) {
  const palette = useMemo(() => (
    faction === 'iron'
      ? { hull: '#6e5436', armor: '#3a2a18', trim: '#d4953a', glass: '#f5d28b' }
      : { hull: '#2e5a64', armor: '#143038', trim: '#4ac4d6', glass: '#a8e7f0' }
  ), [faction]);

  return (
    <group position={position} rotation={[0, heading, 0]}>
      {/* hull */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.0, 2.4]} />
        <meshStandardMaterial color={palette.hull} roughness={0.7} metalness={0.4} />
      </mesh>
      {/* lower armor skirt */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[3.6, 0.5, 2.6]} />
        <meshStandardMaterial color={palette.armor} roughness={0.85} metalness={0.3} />
      </mesh>
      {/* tracks left/right */}
      {[-1.35, 1.35].map((z) => (
        <mesh key={z} position={[0, 0.32, z]} castShadow>
          <boxGeometry args={[3.7, 0.62, 0.45]} />
          <meshStandardMaterial color="#1a1208" roughness={0.95} metalness={0.1} />
        </mesh>
      ))}
      {/* track studs */}
      {[-1, -0.4, 0.2, 0.8, 1.4, -1.6].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.32, -1.35]}>
            <cylinderGeometry args={[0.18, 0.18, 0.5, 8]} />
            <meshStandardMaterial color="#0a0805" roughness={1} />
          </mesh>
          <mesh position={[x, 0.32, 1.35]}>
            <cylinderGeometry args={[0.18, 0.18, 0.5, 8]} />
            <meshStandardMaterial color="#0a0805" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* turret + barrel */}
      <group position={[0.2, 1.25, 0]} rotation={[0, turretAngle, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.95, 1.1, 0.6, 12]} />
          <meshStandardMaterial color={palette.hull} roughness={0.6} metalness={0.5} />
        </mesh>
        {/* commander hatch */}
        <mesh position={[-0.3, 0.32, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.1, 12]} />
          <meshStandardMaterial color={palette.armor} roughness={0.8} />
        </mesh>
        {/* barrel */}
        <mesh position={[1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 2.6, 10]} />
          <meshStandardMaterial color={palette.armor} roughness={0.45} metalness={0.7} />
        </mesh>
        {/* muzzle brake */}
        <mesh position={[2.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.35, 10]} />
          <meshStandardMaterial color={palette.trim} roughness={0.4} metalness={0.8} emissive={palette.trim} emissiveIntensity={0.06} />
        </mesh>
      </group>
      {/* exhaust stacks (dieselpunk flavor) */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[-1.55, 1.3, x * 0.4]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.9, 8]} />
          <meshStandardMaterial color="#1a120c" roughness={0.95} />
        </mesh>
      ))}
      {/* faction lamp */}
      <mesh position={[1.6, 1.1, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color={palette.trim}
          emissive={palette.trim}
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
}
