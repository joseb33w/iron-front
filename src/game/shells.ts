import * as THREE from 'three';

export type ShellType = 'AP' | 'HE' | 'SMOKE';

export type Shell = {
  id: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  type: ShellType;
  lifetime: number;
  hostile: boolean;
  windX: number;
};

export function spawnShell(id: number, origin: THREE.Vector3, vel: THREE.Vector3, type: ShellType, hostile = false): Shell {
  return {
    id,
    pos: origin.clone(),
    vel: vel.clone(),
    type,
    lifetime: 0,
    hostile,
    windX: (Math.random() - 0.5) * 1.4,
  };
}
