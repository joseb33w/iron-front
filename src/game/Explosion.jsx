import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Cosmetic explosion: expanding glow sphere + outward shards. Lives ~0.6s.
export default function Explosion({ x, y = 1, z, color = '#ffb858', startedAt }) {
  const ref = useRef();
  const shardRefs = useRef([]);
  shardRefs.current = [];

  const seeds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arr.push({
        dx: Math.cos(a) * (0.6 + Math.random() * 0.4),
        dy: 0.4 + Math.random() * 0.6,
        dz: Math.sin(a) * (0.6 + Math.random() * 0.4),
        scale: 0.18 + Math.random() * 0.12,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = (state.clock.elapsedTime - startedAt);
    const f = Math.max(0, Math.min(1, t / 0.6));
    if (ref.current) {
      const s = 0.4 + f * 4;
      ref.current.scale.set(s, s, s);
      if (ref.current.material) ref.current.material.opacity = (1 - f) * 0.85;
    }
    shardRefs.current.forEach((m, i) => {
      const seed = seeds[i];
      if (!m || !seed) return;
      const dist = f * 4;
      m.position.set(x + seed.dx * dist, y + seed.dy * (1 - f * 0.5) * 2, z + seed.dz * dist);
      m.scale.setScalar(seed.scale * (1 - f * 0.6));
      if (m.material) m.material.opacity = 1 - f;
    });
  });

  return (
    <group>
      <mesh ref={ref} position={[x, y, z]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) shardRefs.current[i] = el; }}
          position={[x, y, z]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#fff6b0" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
