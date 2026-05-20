import { useMemo } from 'react';
import { TRENCH_RANGE, WORLD_HALF } from './gameState';

export default function World({ frontPosition }) {
  // Trench is rendered as a glowing slab at z = trenchZ(frontPosition)
  const trenchZ = useMemo(() => (0.5 - frontPosition) * 2 * TRENCH_RANGE, [frontPosition]);

  return (
    <group>
      {/* big ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 4]} />
        <meshStandardMaterial color="#1a1208" roughness={1} />
      </mesh>

      {/* Iron-controlled side tint (north / -Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -WORLD_HALF * 1.2]}>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 2.4]} />
        <meshStandardMaterial color="#2a1d10" transparent opacity={0.9} roughness={1} />
      </mesh>
      {/* Steam-controlled side tint (south / +Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, WORLD_HALF * 1.2]}>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 2.4]} />
        <meshStandardMaterial color="#0e2429" transparent opacity={0.9} roughness={1} />
      </mesh>

      {/* trench glow line */}
      <mesh position={[0, 0.05, trenchZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_HALF * 4, 3.6]} />
        <meshStandardMaterial
          color="#d4953a"
          emissive="#d4953a"
          emissiveIntensity={0.55}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* trench walls (raised berm to read in 3D) */}
      <mesh position={[0, 0.55, trenchZ - 2.4]} castShadow>
        <boxGeometry args={[WORLD_HALF * 4, 1.1, 0.6]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} />
      </mesh>
      <mesh position={[0, 0.55, trenchZ + 2.4]} castShadow>
        <boxGeometry args={[WORLD_HALF * 4, 1.1, 0.6]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} />
      </mesh>

      {/* distant smoke columns (atmosphere) */}
      {[-60, -20, 30, 70].map((x, i) => (
        <mesh key={i} position={[x, 8, -WORLD_HALF * 2 + (i % 2) * 12]} rotation={[0, 0, 0]}>
          <coneGeometry args={[1.5, 16, 8, 1, true]} />
          <meshStandardMaterial color="#2a2018" transparent opacity={0.5} side={2} />
        </mesh>
      ))}

      {/* horizon mountains as two flat ridges */}
      <mesh position={[0, 4, -WORLD_HALF * 2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[WORLD_HALF * 5, 8, 0.5]} />
        <meshStandardMaterial color="#0e0a06" roughness={1} />
      </mesh>
      <mesh position={[0, 4, WORLD_HALF * 2]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[WORLD_HALF * 5, 8, 0.5]} />
        <meshStandardMaterial color="#06141a" roughness={1} />
      </mesh>
    </group>
  );
}
