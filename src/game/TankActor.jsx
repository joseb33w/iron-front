import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Tank from './Tank';

// Tank wrapper that owns its own group ref + tread phase, used for both AI tanks and
// remote multiplayer tanks. Smoothly interpolates pose toward the latest target.
export default function TankActor({ targetX, targetZ, targetHeading, faction, hp = 100, maxHp = 100, callsign, fast = false }) {
  const ref = useRef();
  const treadPhaseRef = useRef(0);

  useFrame((_state, dt) => {
    if (!ref.current) return;
    const k = fast ? 0.35 : 0.18;
    ref.current.position.x += (targetX - ref.current.position.x) * k;
    ref.current.position.z += (targetZ - ref.current.position.z) * k;
    const cur = ref.current.rotation.y;
    let diff = ((targetHeading - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    ref.current.rotation.y = cur + diff * k;
    treadPhaseRef.current += dt * 8;
  });

  return (
    <group ref={ref} position={[targetX, 0, targetZ]} rotation={[0, targetHeading, 0]}>
      <Tank faction={faction} hp={hp} maxHp={maxHp} treadPhase={treadPhaseRef.current} />
      {callsign && (
        <CallsignTag callsign={callsign} faction={faction} />
      )}
    </group>
  );
}

function CallsignTag({ callsign, faction }) {
  const color = faction === 'iron' ? '#f5b85a' : '#7ce4f5';
  return (
    <group position={[0, 4.0, 0]}>
      <mesh>
        <planeGeometry args={[Math.max(1.5, callsign.length * 0.25), 0.35]} />
        <meshBasicMaterial color="#000" opacity={0.65} transparent />
      </mesh>
      <mesh position={[0, -0.22, 0.001]}>
        <planeGeometry args={[Math.max(1.5, callsign.length * 0.25), 0.06]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
