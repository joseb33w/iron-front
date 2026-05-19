import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, t, rpc, PlayerRow } from './supabase';

type Ctx = {
  session: Session | null;
  user: User | null;
  player: PlayerRow | null;
  loading: boolean;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
  enlist: (callsign: string, factionSlug: 'crimson_vanguard' | 'iron_compact') => Promise<PlayerRow>;
};

const AuthCtx = createContext<Ctx | null>(null);

// Wraps `console.time` so the markers are always cheap in production
// and easy to grep for in DevTools. Survives across reloads.
const T = {
  start: (k: string) => { try { console.time(`[ironfront] ${k}`); } catch {} },
  end:   (k: string) => { try { console.timeEnd(`[ironfront] ${k}`); } catch {} },
};

// Module-level latch: if the project doesn't have anonymous sign-ins
// enabled, we noted the 422 once and never hit that endpoint again in
// this tab.
let anonNativeDisabled = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const inflightSignIn = useRef<Promise<void> | null>(null);

  const fetchPlayer = useCallback(async (uid: string) => {
    T.start('fetch_player');
    const { data, error } = await supabase
      .from(t('players'))
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    T.end('fetch_player');
    if (error) console.warn('player fetch:', error.message);
    setPlayer((data as PlayerRow) ?? null);
  }, []);

  useEffect(() => {
    T.start('auth_bootstrap');
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await fetchPlayer(data.session.user.id);
      setLoading(false);
      T.end('auth_bootstrap');
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      if (s) await fetchPlayer(s.user.id);
      else setPlayer(null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [fetchPlayer]);

  const signInAnon = useCallback(async () => {
    // De-dupe concurrent calls so a pre-warm + on-click click don't
    // each kick off a duplicate sign-up.
    if (inflightSignIn.current) return inflightSignIn.current;
    const p = (async () => {
      T.start('sign_in_anon_total');
      // Try the native anonymous sign-in first — it's a single round trip
      // (no email confirmation flow). Falls back to the recruit-email path
      // if the project doesn't have anonymous sign-ins enabled. We feature-
      // detect once per session so a disabled-provider 422 doesn't fire
      // on every retry.
      if (!anonNativeDisabled) {
        try {
          T.start('sign_in_anon_native');
          const r = await supabase.auth.signInAnonymously();
          T.end('sign_in_anon_native');
          if (!r.error) {
            T.end('sign_in_anon_total');
            return;
          }
          if (/anonymous|disabled|provider/i.test(r.error.message ?? '')) {
            anonNativeDisabled = true;
          } else {
            throw r.error;
          }
        } catch (e: any) {
          try { T.end('sign_in_anon_native'); } catch {}
          if (/anonymous|disabled|provider/i.test(e?.message ?? '')) {
            anonNativeDisabled = true;
          }
        }
      }
      const seed = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(8, '0');
      const email = `recruit-${seed}@iron-front.dev`;
      const password = `${seed}${seed.toUpperCase()}A1!`;
      T.start('sign_up');
      const { error: suErr } = await supabase.auth.signUp({ email, password });
      T.end('sign_up');
      if (suErr && !/already registered/i.test(suErr.message)) throw suErr;
      T.start('confirm_recruit');
      await supabase.rpc(rpc('confirm_recruit_email'), { p_email: email });
      T.end('confirm_recruit');
      T.start('sign_in_password');
      const r = await supabase.auth.signInWithPassword({ email, password });
      T.end('sign_in_password');
      if (r.error) throw r.error;
      T.end('sign_in_anon_total');
    })().finally(() => { inflightSignIn.current = null; });
    inflightSignIn.current = p;
    return p;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (session?.user.id) await fetchPlayer(session.user.id);
  }, [session, fetchPlayer]);

  const enlist = useCallback(async (callsign: string, factionSlug: 'crimson_vanguard' | 'iron_compact') => {
    T.start('enlist_rpc');
    const { data, error } = await supabase.rpc(rpc('enlist_player'), {
      p_callsign: callsign,
      p_faction_slug: factionSlug,
    });
    T.end('enlist_rpc');
    if (error) throw error;
    setPlayer(data as PlayerRow);
    return data as PlayerRow;
  }, []);

  return (
    <AuthCtx.Provider value={{
      session,
      user: session?.user ?? null,
      player,
      loading,
      signInAnon,
      signOut,
      refreshPlayer,
      enlist,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
};
