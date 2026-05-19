// Iron Front — resolve_battle Edge Function (Deno runtime).
// Wraps the SECURITY DEFINER Postgres function `usr_nmexs7bytxq2_resolve_battle`
// so future logic (event broadcasts, external webhooks) can be added without
// migrating database state.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const auth = req.headers.get('authorization') ?? '';
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });

  const { battle_id, winning_faction_slug } = await req.json();

  const { data, error } = await supa.rpc('usr_nmexs7bytxq2_resolve_battle', {
    p_battle_id: battle_id,
    p_winning_faction_slug: winning_faction_slug,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
