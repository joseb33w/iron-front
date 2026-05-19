// Iron Front — validate_hit Edge Function (Deno runtime)
// Mirrors the SECURITY DEFINER Postgres function `usr_nmexs7bytxq2_validate_hit`.
// Deploy with: supabase functions deploy validate_hit

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type V3 = { x: number; y: number; z: number };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const auth = req.headers.get('authorization') ?? '';
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: auth } } },
  );

  const { battle_id, shooter_pos, target_pos, impact_normal, shell_velocity, shell_type, armor_thickness } = await req.json();

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: 'unauthenticated' }, 401);

  const range = dist(shooter_pos, target_pos);
  if (range > 2500) return json({ outcome: 'out_of_range', damage: 0, range });

  const speed = Math.hypot(shell_velocity.x, shell_velocity.y, shell_velocity.z) || 1;
  const dot = (shell_velocity.x * impact_normal.x + shell_velocity.y * impact_normal.y + shell_velocity.z * impact_normal.z) / speed;
  const ang = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot))));
  const angDeg = (ang * 180) / Math.PI;

  const eff = armor_thickness / Math.max(Math.cos(ang), 0.05);
  const pen = shell_type === 'AP' ? 180 * (1 - range / 4000)
            : shell_type === 'HE' ? 60  * (1 - range / 4000)
            : 0;

  let outcome = 'penetration';
  let damage = 0;
  if (angDeg > 70) { outcome = 'ricochet'; damage = 0; }
  else if (pen < eff) { outcome = 'bounce'; damage = 0; }
  else {
    damage = Math.min(100, 25 + (pen - eff) * 0.5);
    if (shell_type === 'HE') damage += 15;
  }

  return json({ outcome, damage, range, impact_angle_deg: angDeg, effective_armor: eff, penetration: pen });
});

function dist(a: V3, b: V3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}
