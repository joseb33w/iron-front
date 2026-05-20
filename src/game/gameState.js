// World layout (units = meters):
//   X axis: east-west, range [-WORLD_HALF, WORLD_HALF] for both factions
//   Z axis: north-south, Iron base at -Z, Steam base at +Z
//   Front line is a Z-coordinate computed from front.position (0..1):
//     position = 0   → trench at Z = +TRENCH_RANGE  (deep in Steam territory, Steam losing)
//     position = 1   → trench at Z = -TRENCH_RANGE  (deep in Iron territory, Iron losing)
//     position = 0.5 → trench at Z = 0              (centered)
export const WORLD_HALF = 80;
export const TRENCH_RANGE = 50;
export const BUNKER_OFFSET = 22;
export const BUNKER_COUNT = 5;

export const TANK_SPEED = 12;
export const TANK_REVERSE = 6;
export const TANK_TURN = 1.6;
export const SHELL_SPEED = 70;
export const SHELL_LIFETIME = 2.2;
export const FIRE_COOLDOWN = 0.55;
export const BUNKER_RADIUS = 3.4;
export const BUNKER_RESPAWN = 2.5;

export const PLAYER_MAX_HP = 120;
export const AI_MAX_HP = 60;
export const AI_FIRE_COOLDOWN = 2.2;
export const AI_SIGHT_RANGE = 50;
export const AI_DAMAGE = 7;
export const AI_SHELL_RADIUS = 1.8;
export const PLAYER_SHELL_DAMAGE = 25;
export const PLAYER_RESPAWN_DELAY = 3.0;
export const PLAYER_INVUL_AFTER_RESPAWN = 1.8;

export const AI_TANK_COUNT = 4;

export function trenchZ(position) {
  return (0.5 - position) * 2 * TRENCH_RANGE;
}

export function bunkerSideZ(position, faction) {
  const z0 = trenchZ(position);
  return faction === 'iron' ? z0 + BUNKER_OFFSET : z0 - BUNKER_OFFSET;
}

export function aiTankSideZ(position, playerFaction) {
  const z0 = trenchZ(position);
  return playerFaction === 'iron' ? z0 + BUNKER_OFFSET + 14 : z0 - BUNKER_OFFSET - 14;
}

export function spawnZForPlayer(faction) {
  return faction === 'iron' ? -TRENCH_RANGE - 30 : TRENCH_RANGE + 30;
}

export function spawnHeading(faction) {
  return faction === 'iron' ? -Math.PI / 2 : Math.PI / 2;
}

export function forwardVec(heading) {
  return { x: Math.cos(heading), z: -Math.sin(heading) };
}

export function generateBunkerRow(position, faction, seed = 0) {
  const z = bunkerSideZ(position, faction);
  const spacing = (WORLD_HALF * 1.6) / (BUNKER_COUNT - 1);
  const startX = -((BUNKER_COUNT - 1) * spacing) / 2;
  const out = [];
  for (let i = 0; i < BUNKER_COUNT; i++) {
    out.push({
      id: `b-${seed}-${i}`,
      x: startX + i * spacing + (Math.sin(seed + i) * 2),
      z: z + Math.cos(seed + i * 1.7) * 2,
      alive: true,
      respawnAt: 0,
    });
  }
  return out;
}

export function generateAiTanks(position, playerFaction, seed = 0) {
  const baseZ = aiTankSideZ(position, playerFaction);
  const spacing = (WORLD_HALF * 1.5) / AI_TANK_COUNT;
  const startX = -((AI_TANK_COUNT - 1) * spacing) / 2;
  const enemyFaction = playerFaction === 'iron' ? 'steam' : 'iron';
  const out = [];
  for (let i = 0; i < AI_TANK_COUNT; i++) {
    const baseX = startX + i * spacing + Math.sin(seed + i) * 5;
    out.push({
      id: `ai-${seed}-${i}`,
      faction: enemyFaction,
      x: baseX,
      z: baseZ + Math.cos(seed + i * 1.7) * 6,
      heading: playerFaction === 'iron' ? Math.PI / 2 : -Math.PI / 2,
      hp: AI_MAX_HP,
      alive: true,
      cooldown: 0,
      patrolX: baseX,
      patrolZ: baseZ + Math.cos(seed + i * 1.7) * 6,
      patrolPhase: i * 1.3,
      respawnAt: 0,
    });
  }
  return out;
}
