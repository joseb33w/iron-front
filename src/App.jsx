import { useCallback, useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import FactionPicker from './components/FactionPicker';
import Game from './game/Game';
import Hud from './components/Hud';
import { useFrontLine } from './hooks/useFrontLine';
import { useLeaderboard } from './hooks/useLeaderboard';
import { usePlayer } from './hooks/usePlayer';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const { player, loading: playerLoading, createPlayer, refresh: refreshPlayer } = usePlayer(session);
  const { front, recordKill } = useFrontLine();
  const leaderboard = useLeaderboard(8);

  const handleKill = useCallback(async (x, z) => {
    const res = await recordKill(x, z);
    if (!res.error) refreshPlayer();
  }, [recordKill, refreshPlayer]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (!authReady) {
    return (
      <div className="fullscreen-bg">
        <div className="card"><p className="loading">Booting iron furnaces…</p></div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (playerLoading) {
    return (
      <div className="fullscreen-bg">
        <div className="card"><p className="loading">Loading dossier…</p></div>
      </div>
    );
  }

  if (!player) {
    return <FactionPicker session={session} onCreate={createPlayer} />;
  }

  return (
    <>
      <Game player={player} front={front} onKill={handleKill} />
      <Hud player={player} front={front} onSignOut={handleSignOut} leaderboard={leaderboard} />
    </>
  );
}
