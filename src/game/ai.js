import { forwardVec, AI_FIRE_COOLDOWN, AI_SIGHT_RANGE, TANK_SPEED, TANK_TURN } from './gameState';

export function stepAi(ai, dt, playerPose, t) {
  if (!ai.alive) return { ai, shell: null };

  const dx = playerPose.x - ai.x;
  const dz = playerPose.z - ai.z;
  const dist = Math.hypot(dx, dz);

  const targetingPlayer = dist <= AI_SIGHT_RANGE;
  let targetHeading;
  if (targetingPlayer) {
    targetHeading = Math.atan2(-dz, dx);
  } else {
    const px = ai.patrolX + Math.sin(t * 0.3 + ai.patrolPhase) * 6;
    const pz = ai.patrolZ + Math.cos(t * 0.25 + ai.patrolPhase) * 4;
    const ax = px - ai.x;
    const az = pz - ai.z;
    targetHeading = Math.atan2(-az, ax);
  }

  const turnSpeed = TANK_TURN * 0.8;
  let dh = ((targetHeading - ai.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const maxTurn = turnSpeed * dt;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, dh));
  const newHeading = ai.heading + turn;

  let moveSpeed = 0;
  if (targetingPlayer) {
    if (dist > 32) moveSpeed = TANK_SPEED * 0.55;
    else if (dist < 18) moveSpeed = -TANK_SPEED * 0.4;
  } else {
    moveSpeed = TANK_SPEED * 0.3;
  }
  if (Math.abs(dh) > 0.6) moveSpeed *= 0.3;

  const fwd = forwardVec(newHeading);
  const newX = ai.x + fwd.x * moveSpeed * dt;
  const newZ = ai.z + fwd.z * moveSpeed * dt;

  const newCd = Math.max(0, ai.cooldown - dt);

  let shell = null;
  if (targetingPlayer && newCd <= 0 && Math.abs(dh) < 0.3 && dist > 6) {
    const fwd2 = forwardVec(newHeading);
    shell = {
      x: newX + fwd2.x * 3,
      y: 1.3,
      z: newZ + fwd2.z * 3,
      vx: fwd2.x * 55,
      vz: fwd2.z * 55,
      t: 0,
      ownerId: ai.id,
    };
  }

  return {
    ai: { ...ai, heading: newHeading, x: newX, z: newZ, cooldown: shell ? AI_FIRE_COOLDOWN : newCd },
    shell,
  };
}
