// Store catalog. Items are bought ONCE (permanent ownership), then equipped to take effect.
// Up to 3 items can be equipped at a time.

export const STORE_ITEMS = [
  {
    id: 'wpn_rapid',
    name: 'Rapid Cannon',
    description: 'Halved cooldown between shots. Light shells, fast cycle.',
    cost: 25,
    kind: 'weapon',
    emblem: '⚡',
    color: '#ffcb50',
    effects: { fireCooldown: 0.55 * 0.5 },
  },
  {
    id: 'wpn_dual',
    name: 'Dual Cannons',
    description: 'Two parallel shells per shot for spread fire.',
    cost: 40,
    kind: 'weapon',
    emblem: '⫶',
    color: '#ff8c4a',
    effects: { shellsPerShot: 2 },
  },
  {
    id: 'wpn_missile',
    name: 'Missile Launcher',
    description: 'Explosive radius. Slower reload, but it splashes.',
    cost: 60,
    kind: 'weapon',
    emblem: '☄',
    color: '#ff5a3d',
    effects: { explosionRadius: 6, fireCooldown: 0.55 * 1.4, shellDamageRadius: 6 },
  },
  {
    id: 'pwr_armor',
    name: 'Reinforced Armor',
    description: 'Take 50% less damage from enemy fire.',
    cost: 30,
    kind: 'powerup',
    emblem: '⛨',
    color: '#9ec5ff',
    effects: { damageMul: 0.5 },
  },
  {
    id: 'pwr_repair',
    name: 'Field Repair',
    description: 'Auto-repair 4 HP/sec while not under fire.',
    cost: 30,
    kind: 'powerup',
    emblem: '✚',
    color: '#5cf07a',
    effects: { autoRepair: 4 },
  },
  {
    id: 'pwr_boost',
    name: 'Engine Tuning',
    description: '+40% drive speed and quicker turning.',
    cost: 25,
    kind: 'powerup',
    emblem: '➤',
    color: '#ffd866',
    effects: { speedMul: 1.4, turnMul: 1.3 },
  },
  {
    id: 'pwr_radar',
    name: 'Scout Radar',
    description: 'Reveals enemy positions on the minimap.',
    cost: 20,
    kind: 'powerup',
    emblem: '◎',
    color: '#7adfff',
    effects: { radar: true },
  },
  {
    id: 'pwr_damage',
    name: 'Heavy Shells',
    description: '+50% shell damage. Bunkers and tanks fall faster.',
    cost: 35,
    kind: 'powerup',
    emblem: '⛓',
    color: '#ff7878',
    effects: { damageOutMul: 1.5 },
  },
];

export const ITEM_BY_ID = Object.fromEntries(STORE_ITEMS.map((i) => [i.id, i]));

export function combineEffects(equippedIds = []) {
  const out = {
    fireCooldown: 0.55,
    shellsPerShot: 1,
    explosionRadius: 0,
    shellDamageRadius: 0,
    damageMul: 1,
    damageOutMul: 1,
    speedMul: 1,
    turnMul: 1,
    autoRepair: 0,
    radar: false,
  };
  for (const id of equippedIds) {
    const item = ITEM_BY_ID[id];
    if (!item) continue;
    for (const [k, v] of Object.entries(item.effects)) {
      if (typeof v === 'boolean') out[k] = out[k] || v;
      else if (k === 'fireCooldown') out[k] = Math.min(out[k], v);
      else if (k === 'shellsPerShot') out[k] = Math.max(out[k], v);
      else if (k === 'explosionRadius' || k === 'shellDamageRadius') out[k] = Math.max(out[k], v);
      else if (k === 'damageMul') out[k] = Math.min(out[k], v);
      else if (k === 'damageOutMul' || k === 'speedMul' || k === 'turnMul') out[k] = out[k] * v;
      else if (k === 'autoRepair') out[k] = Math.max(out[k], v);
      else out[k] = v;
    }
  }
  return out;
}

export const MAX_EQUIPPED = 3;
