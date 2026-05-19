import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Lightweight billboard "smoke" puff — a soft-edged sphere that grows + fades.
 * We use a screen-facing plane with a procedural fragment to keep it cheap
 * (raymarched volumetric smoke would tank framerate on integrated GPUs;
 * the brief approves "billboard particle" as the cost-efficient analogue).
 */
export function Smoke({ pos, t }: { pos: THREE.Vector3; t: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const life = 3.2;
  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.lookAt(camera.position);
    const k = Math.min(1, t / life);
    const scale = 0.6 + k * 4.5;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.ShaderMaterial).uniforms.uOpacity.value = (1 - k) * 0.85;
  });

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0.85 }, uTint: { value: new THREE.Color('#3a342c') } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uOpacity;
      uniform vec3 uTint;
      // hash + soft puff
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i + vec2(1,0));
        float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float n = noise(vUv * 7.0) * 0.5 + noise(vUv * 14.0) * 0.25;
        float alpha = smoothstep(1.0, 0.2, r) * (0.6 + n * 0.5);
        gl_FragColor = vec4(uTint * (0.55 + n * 0.5), alpha * uOpacity);
      }
    `,
  }), []);

  return (
    <mesh ref={ref} position={pos} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
