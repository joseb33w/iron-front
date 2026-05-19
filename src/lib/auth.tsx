import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayer = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from(t('players'))
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) console.warn('player fetch:', error.message);
    setPlayer((data as PlayerRow) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await fetchPlayer(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      if (s) await fetchPlayer(s.user.id);
      else setPlayer(null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [fetchPlayer]);

  const signInAnon = useCallback(async () => {
    // Synthesize a fresh recruit identity. We use email/password under the hood
    // (Supabase anonymous-auth is disabled on the shared project). To skip the
    // inbox round-trip, the server has a SECURITY DEFINER RPC that confirms
    // emails matching the strict `recruit-<hex>@iron-front.dev` pattern only.
    const seed = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(8, '0');
    const email = `recruit-${seed}@iron-front.dev`;
    const password = `${seed}${seed.toUpperCase()}A1!`;
    const { error: suErr } = await supabase.auth.signUp({ email, password });
    if (suErr && !/already registered/i.test(suErr.message)) throw suErr;
    await supabase.rpc(rpc('confirm_recruit_email'), { p_email: email });
    const r = await supabase.auth.signInWithPassword({ email, password });
    if (r.error) throw r.error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (session?.user.id) await fetchPlayer(session.user.id);
  }, [session, fetchPlayer]);

  const enlist = useCallback(async (callsign: string, factionSlug: 'crimson_vanguard' | 'iron_compact') => {
    const { data, error } = await supabase.rpc(rpc('enlist_player'), {
      p_callsign: callsign,
      p_faction_slug: factionSlug,
    });
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
