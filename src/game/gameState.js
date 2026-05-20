// World layout (units = meters):
//   X axis: east-west, range [-WORLD_HALF, WORLD_HALF] for both factions
//   Z axis: north-south, Iron base at -Z, Steam base at +Z
//   Front line is a Z-coordinate computed from front.position (0..1):
//     position = 0   → trench at Z = +TRENCH_RANGE  (deep in Steam territory, Steam losing)
//     position = 1   → trench at Z = -TRENCH_RANGE  (deep in Iron territory, Iron losing)
//     position = 0.5 → trench at Z = 0              (centered)
export const WORLD_HALF = 80;     // half of east-west width
export const TRENCH_RANGE = 50;   // how far trench can shift north/south
export const BUNKER_OFFSET = 22;  // bunker placement distance from the trench (on the enemy side)
export const BUNKER_COUNT = 5;    // bunkers in a row

export const TANK_SPEED = 12;       // m/s forward
export const TANK_REVERSE = 6;      // m/s backward
export const TANK_TURN = 1.6;       // rad/s
export const SHELL_SPEED = 70;      // m/s
export const SHELL_LIFETIME = 2.2;  // seconds
export const FIRE_COOLDOWN = 0.55;  // seconds
export const BUNKER_RADIUS = 2.6;   // hit radius (m)
export const BUNKER_RESPAWN = 2.5;  // seconds to respawn a downed bunker

export function trenchZ(position) {
  return (0.5 - position) * 2 * TRENCH_RANGE;
}

export function bunkerSideZ(position, faction) {
  // bunkers are on the OPPOSITE faction's side of the trench
  const z0 = trenchZ(position);
  return faction === 'iron' ? z0 + BUNKER_OFFSET : z0 - BUNKER_OFFSET;
}

export function spawnZForPlayer(faction) {
  return faction === 'iron' ? -TRENCH_RANGE - 30 : TRENCH_RANGE + 30;
}

export function spawnHeading(faction) {
  // Three.js Y-rotation: local +X (barrel forward) maps to world (cos h, 0, -sin h).
  // Iron base at -Z wants to face enemy at +Z → need (cos h, -sin h) = (0, +1) → h = -π/2.
  // Steam base at +Z wants to face -Z → h = +π/2.
  return faction === 'iron' ? -Math.PI / 2 : Math.PI / 2;
}

// Forward unit vector in world, given the tank's heading (rotation.y).
// Local +X is the barrel direction; under Y-rotation by h, it maps to (cos h, 0, -sin h).
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
      x: startX + i * spacing + (Math.sin(seed + i) * 4),
      z: z + Math.cos(seed + i * 1.7) * 3,
      alive: true,
      respawnAt: 0,
    });
  }
  return out;
}
