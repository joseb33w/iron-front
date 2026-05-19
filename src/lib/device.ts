// Device + graphics tier detection. Persisted per-device in localStorage.
// Conservative defaults: mobile -> medium; we let users override Low / High.

export type GraphicsTier = 'low' | 'medium' | 'high';

const TIER_KEY = 'iron-front:graphics-tier';

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
}

export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Probe the GPU vendor via WebGL. Mali / Adreno / PowerVR / Apple GPU ⇒ mobile chip.
// We use a one-shot probe and cache the result.
let cachedGpuVendor: string | null = null;
export function gpuVendor(): string {
  if (cachedGpuVendor !== null) return cachedGpuVendor;
  if (typeof document === 'undefined') {
    cachedGpuVendor = '';
    return '';
  }
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      cachedGpuVendor = '';
      return '';
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const v = ext ? (gl.getParameter((ext as any).UNMASKED_RENDERER_WEBGL) as string) : '';
    cachedGpuVendor = (v || '').toString();
  } catch {
    cachedGpuVendor = '';
  }
  return cachedGpuVendor;
}

export function isMobileGPU(): boolean {
  const v = gpuVendor().toLowerCase();
  return /(adreno|mali|powervr|apple gpu|videocore|swiftshader)/.test(v);
}

export function isMobile(): boolean {
  return isMobileUA() || (isTouchDevice() && isMobileGPU());
}

// devicePixelRatio cap.
export function capDpr(): number {
  if (typeof window === 'undefined') return 1;
  const raw = window.devicePixelRatio || 1;
  return isMobile() ? Math.min(raw, 2) : Math.min(raw, 2.5);
}

export function autoTier(): GraphicsTier {
  if (isMobile()) return 'medium';
  return 'high';
}

export function loadGraphicsTier(): GraphicsTier {
  if (typeof localStorage === 'undefined') return autoTier();
  const v = localStorage.getItem(TIER_KEY);
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return autoTier();
}

export function saveGraphicsTier(t: GraphicsTier) {
  try {
    localStorage.setItem(TIER_KEY, t);
  } catch {}
}

// Tunables derived from the active tier. Components import these so the same
// numbers don't get scattered across the codebase.
export function tierTuning(tier: GraphicsTier) {
  switch (tier) {
    case 'low':
      return {
        dprMax: 1,
        shadowMapSize: 512,
        smokeNoiseOctaves: 1,
        ruinsCount: 14,
        bloomEnabled: false,
        vignetteEnabled: true,
        fogFarMul: 0.7,
        warmapStars: 200,
        antialias: false,
      } as const;
    case 'medium':
      return {
        dprMax: capDpr(),
        shadowMapSize: 1024,
        smokeNoiseOctaves: 1,
        ruinsCount: 22,
        bloomEnabled: true,
        vignetteEnabled: true,
        fogFarMul: 0.9,
        warmapStars: 600,
        antialias: true,
      } as const;
    case 'high':
    default:
      return {
        dprMax: 2,
        shadowMapSize: 2048,
        smokeNoiseOctaves: 2,
        ruinsCount: 36,
        bloomEnabled: true,
        vignetteEnabled: true,
        fogFarMul: 1.0,
        warmapStars: 1200,
        antialias: true,
      } as const;
  }
}

export function isPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(orientation: portrait)').matches ?? window.innerHeight > window.innerWidth;
}
