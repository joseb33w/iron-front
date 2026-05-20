import { useMemo } from 'react';
import { Environment, Cloud } from '@react-three/drei';
import { TRENCH_RANGE, WORLD_HALF } from './gameState';

export default function World({ frontPosition, world }) {
  const tZ = useMemo(() => (0.5 - frontPosition) * 2 * TRENCH_RANGE, [frontPosition]);
  const { id, sky, fog, ground, grass, accent, rockColor, prop } = world;

  return (
    <group>
      <Environment preset={sky} background={false} />
      <fog attach="fog" args={[fog.color, fog.near, fog.far]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 4, 32, 32]} />
        <meshStandardMaterial color={ground.color} roughness={ground.roughness} metalness={ground.metalness} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, -WORLD_HALF * 1.2]}>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 2.4]} />
        <meshStandardMaterial color={grass} transparent opacity={0.5} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, WORLD_HALF * 1.2]}>
        <planeGeometry args={[WORLD_HALF * 4, WORLD_HALF * 2.4]} />
        <meshStandardMaterial color={grass} transparent opacity={0.5} roughness={1} />
      </mesh>

      <mesh position={[0, 0.06, tZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_HALF * 4, 3.8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0.6, tZ - 2.5]} castShadow>
        <boxGeometry args={[WORLD_HALF * 4, 1.2, 0.7]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      <mesh position={[0, 0.6, tZ + 2.5]} castShadow>
        <boxGeometry args={[WORLD_HALF * 4, 1.2, 0.7]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      {[-72, -60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60, 72].map((x) => (
        <mesh key={x} position={[x, 1.0, tZ]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.6, 6]} />
          <meshStandardMaterial color="#1a1208" roughness={1} metalness={0.4} />
        </mesh>
      ))}

      {prop === 'rocks' && <Rocks rockColor={rockColor} />}
      {prop === 'girders' && <Girders accent={accent} />}
      {prop === 'iceshards' && <IceShards accent={accent} />}

      {id !== 'foundry' && (
        <>
          <Cloud position={[-40, 30, -120]} opacity={0.35} speed={0.1} segments={20} bounds={[10, 4, 4]} />
          <Cloud position={[60, 28, -100]} opacity={0.3} speed={0.08} segments={20} bounds={[12, 4, 4]} />
          <Cloud position={[0, 32, 130]} opacity={0.3} speed={0.06} segments={20} bounds={[14, 4, 4]} />
        </>
      )}

      <mesh position={[0, 5, -WORLD_HALF * 2.4]}>
        <boxGeometry args={[WORLD_HALF * 6, 10, 0.5]} />
        <meshStandardMaterial color={rockColor} roughness={1} />
      </mesh>
      <mesh position={[0, 5, WORLD_HALF * 2.4]}>
        <boxGeometry args={[WORLD_HALF * 6, 10, 0.5]} />
        <meshStandardMaterial color={rockColor} roughness={1} />
      </mesh>
    </group>
  );
}

function Rocks({ rockColor }) {
  const positions = [
    [-50, -30], [-30, -45], [40, -25], [55, -40], [-65, 10],
    [60, 15], [-45, 45], [38, 50], [10, -55], [-20, 55],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.7, z]} rotation={[i * 0.3, i * 1.7, i * 0.6]} castShadow>
          <dodecahedronGeometry args={[1.0 + (i % 3) * 0.35, 0]} />
          <meshStandardMaterial color={rockColor} roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function Girders({ accent }) {
  const positions = [
    [-50, -30, 0.4], [-30, -45, 1.2], [40, -25, -0.8],
    [55, -40, 0.5], [-65, 10, 0], [60, 15, 1.7],
    [-45, 45, 0.3], [38, 50, -1.0], [10, -55, 0.9], [-20, 55, 1.4],
  ];
  return (
    <group>
      {positions.map(([x, z, rot], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 2, 0]} rotation={[0.3, 0, 0.15]} castShadow>
            <boxGeometry args={[0.4, 4.5, 0.4]} />
            <meshStandardMaterial color="#3a2a1c" roughness={0.9} metalness={0.5} />
          </mesh>
          <mesh position={[1.2, 1.4, 0.3]} rotation={[0, 0, -0.5]} castShadow>
            <boxGeometry args={[2.0, 0.35, 0.35]} />
            <meshStandardMaterial color="#46341f" roughness={0.9} metalness={0.5} />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={accent} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function IceShards({ accent }) {
  const positions = [
    [-50, -30, 1.0], [-30, -45, 1.6], [40, -25, 0.7], [55, -40, 1.3],
    [-65, 10, 0.9], [60, 15, 1.4], [-45, 45, 0.8], [38, 50, 1.0],
    [10, -55, 1.2], [-20, 55, 0.85], [25, 25, 1.4], [-25, -10, 1.0],
  ];
  return (
    <group>
      {positions.map(([x, z, scale], i) => (
        <mesh key={i} position={[x, scale * 1.4, z]} rotation={[i * 0.1, i * 1.7, i * 0.3]} castShadow>
          <coneGeometry args={[0.8 * scale, 3.0 * scale, 6]} />
          <meshStandardMaterial color="#dbe7f0" roughness={0.2} metalness={0.4} emissive={accent} emissiveIntensity={0.18} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}
