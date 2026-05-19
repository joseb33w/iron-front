# Edge Functions (optional)

The game's server-side validation is **already deployed** as
`SECURITY DEFINER` Postgres functions, callable via the REST RPC API.
That gives us the same security guarantees as Edge Functions (elevated
privileges, server-side enforcement, anti-cheat) without requiring the
`supabase` CLI to be installed/authenticated on this machine.

The two files in this folder mirror that logic as Deno Edge Functions
in case you want to migrate later (e.g. to add Stripe webhooks, log to
external services, or push to non-Postgres infrastructure).

To deploy:

```bash
supabase login
supabase link --project-ref xhhmxabftbyxrirvvihn
supabase functions deploy validate_hit
supabase functions deploy resolve_battle
```

Both functions are designed to read the same business rules currently
implemented in:

- `usr_nmexs7bytxq2_validate_hit(...)` — anti-cheat hit verification.
- `usr_nmexs7bytxq2_resolve_battle(...)` — sector flip + adjacency rule.

If you deploy these Edge Functions, swap the `supabase.rpc(...)` calls
in `src/pages/Battle.tsx` for `supabase.functions.invoke('validate_hit', ...)`.
