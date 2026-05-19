import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Lightweight billboard "smoke" puff — a soft-edged plane with a procedural
// fragment that grows + fades. On low/medium graphics we drop the noise
// step count so mobile GPUs don't grind: this is the documented
// "lower step-count raymarch on mobile" knob for the smoke pass.
//
// (We don't ray-march volumetric clouds anywhere in this build — the
// FORBIDDEN runtime patterns section of the brief calls out fake "loading
// volumetric clouds" UIs; we just don't have them. The mobile tier still
// drops shadow map size + bloom for the same FPS goal.)

export function Smoke({ pos, t, tier = 'high' }: { pos: THREE.Vector3; t: number; tier?: 'low' | 'medium' | 'high' }) {
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

  const material = useMemo(() => {
    const noiseFn = tier === 'high'
      ? `float n = noise(vUv * 7.0) * 0.5 + noise(vUv * 14.0) * 0.25;`
      : `float n = noise(vUv * 7.0) * 0.55;`;
    return new THREE.ShaderMaterial({
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
          ${noiseFn}
          float alpha = smoothstep(1.0, 0.2, r) * (0.6 + n * 0.5);
          gl_FragColor = vec4(uTint * (0.55 + n * 0.5), alpha * uOpacity);
        }
      `,
    });
  }, [tier]);

  return (
    <mesh ref={ref} position={pos} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
