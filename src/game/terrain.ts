// Procedural heightmap — deterministic hash-noise. Cheap, no deps.

function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393) ^ (y * 668265263) ^ (seed * 2147483647);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothStep(t: number) { return t * t * (3 - 2 * t); }

function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash2(xi, yi, seed);
  const tr = hash2(xi + 1, yi, seed);
  const bl = hash2(xi, yi + 1, seed);
  const br = hash2(xi + 1, yi + 1, seed);
  const u = smoothStep(xf);
  const v = smoothStep(yf);
  return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
}

function fbm(x: number, y: number, seed: number) {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < 5; i++) {
    total += valueNoise(x * freq, y * freq, seed + i * 17) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return total / max;
}

export function generateHeightmap(N: number, seed: number): Float32Array {
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x / N) * 4.5;
      const ny = (y / N) * 4.5;
      const h = (fbm(nx, ny, seed) - 0.5) * 4.0;
      // gently flatten the center for the battle arena
      const dx = (x - N / 2) / (N / 2);
      const dy = (y - N / 2) / (N / 2);
      const r = Math.hypot(dx, dy);
      const arenaMask = Math.max(0, 1 - Math.exp(-r * r * 2.0));
      out[y * N + x] = h * arenaMask * 0.55;
    }
  }
  return out;
}

// World-space height sample. Heightmap covers SIZE x SIZE = 120 x 120 centred on origin.
const SIZE = 120;
export function sampleHeight(hm: Float32Array, x: number, z: number): number {
  const N = Math.sqrt(hm.length) | 0;
  const u = ((x + SIZE / 2) / SIZE) * (N - 1);
  const v = ((z + SIZE / 2) / SIZE) * (N - 1);
  const ui = Math.max(0, Math.min(N - 1, Math.floor(u)));
  const vi = Math.max(0, Math.min(N - 1, Math.floor(v)));
  return hm[vi * N + ui] || 0;
}
