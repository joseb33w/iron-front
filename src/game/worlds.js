// World definitions: name, theme colors, fog, environment preset, ground material, props
export const WORLDS = {
  steppes: {
    id: 'steppes',
    name: 'Iron Steppes',
    tagline: 'Open grasslands. Long sightlines. Brass-hour sky.',
    sky: 'sunset',
    ambient: 0.55,
    sunColor: '#ffd9a0',
    sunIntensity: 1.6,
    skyColor: '#f6d7a8',
    fog: { color: '#d8b88a', near: 90, far: 260 },
    ground: { color: '#7a6442', roughness: 1.0, metalness: 0.0 },
    grass: '#5b5a2e',
    accent: '#d4953a',
    rockColor: '#6a5236',
    prop: 'rocks',
  },
  foundry: {
    id: 'foundry',
    name: 'Foundry Wastes',
    tagline: 'Smoke-streaked horizon. Twisted girders. Industrial decay.',
    sky: 'warehouse',
    ambient: 0.45,
    sunColor: '#ff8e4a',
    sunIntensity: 1.4,
    skyColor: '#3a2418',
    fog: { color: '#3a2018', near: 70, far: 220 },
    ground: { color: '#3a2820', roughness: 1.0, metalness: 0.15 },
    grass: '#2a1d18',
    accent: '#ff6a2a',
    rockColor: '#2a1d10',
    prop: 'girders',
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier Front',
    tagline: 'Frozen plain. Aurora overhead. The cold breaks engines.',
    sky: 'dawn',
    ambient: 0.7,
    sunColor: '#cfe6ff',
    sunIntensity: 1.7,
    skyColor: '#c8def0',
    fog: { color: '#cdd9e3', near: 100, far: 280 },
    ground: { color: '#cad7e0', roughness: 0.95, metalness: 0.05 },
    grass: '#9bb1c2',
    accent: '#7adfff',
    rockColor: '#5a6878',
    prop: 'iceshards',
  },
};

export const WORLD_LIST = Object.values(WORLDS);
export const DEFAULT_WORLD = 'steppes';

export function getWorld(id) {
  return WORLDS[id] || WORLDS[DEFAULT_WORLD];
}
