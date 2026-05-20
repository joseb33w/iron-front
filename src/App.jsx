import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import FactionPicker from './components/FactionPicker';
import WorldPicker from './components/WorldPicker';
import Store from './components/Store';
import Game from './game/Game';
import Hud from './components/Hud';
import { useFrontLine } from './hooks/useFrontLine';
import { useLeaderboard } from './hooks/useLeaderboard';
import { usePlayer } from './hooks/usePlayer';
import { useMultiplayer } from './hooks/useMultiplayer';
import { supabase } from './lib/supabase';
import { getWorld } from './game/worlds';
import { combineEffects } from './game/store';
import { PLAYER_MAX_HP, PLAYER_RESPAWN_DELAY, PLAYER_INVUL_AFTER_RESPAWN } from './game/gameState';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [overlay, setOverlay] = useState(null); // 'store' | 'world' | null

  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [alive, setAlive] = useState(true);
  const [respawnIn, setRespawnIn] = useState(0);
  const respawnTimerRef = useRef(null);
  const invulUntilRef = useRef(0);
  const poseRef = useRef({ x: 0, z: 0, heading: 0, hp: PLAYER_MAX_HP });

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

  const { player, inventory, loading: playerLoading, createPlayer, setCurrentWorld, setEquipped, buyItem, refresh: refreshPlayer } = usePlayer(session);
  const { front, recordKill, recordAiKill, recordDeath } = useFrontLine();
  const leaderboard = useLeaderboard(8);

  const world = useMemo(() => getWorld(player?.current_world || 'steppes'), [player?.current_world]);
  const effects = useMemo(() => combineEffects(player?.equipped || []), [player?.equipped]);

  const handlePlayerDamage = useCallback((amount, kind) => {
    if (kind === 'damage' && (performance.now() / 1000) < invulUntilRef.current) return;
    setHp((cur) => {
      const next = Math.max(0, Math.min(PLAYER_MAX_HP, cur - amount));
      if (kind === 'damage' && next === 0 && cur > 0) {
        setAlive(false);
        setRespawnIn(PLAYER_RESPAWN_DELAY);
        recordDeath?.();
      }
      return next;
    });
  }, [recordDeath]);

  useEffect(() => {
    if (alive) return;
    if (respawnTimerRef.current) clearInterval(respawnTimerRef.current);
    respawnTimerRef.current = setInterval(() => {
      setRespawnIn((r) => {
        const next = r - 0.1;
        if (next <= 0) {
          clearInterval(respawnTimerRef.current);
          respawnTimerRef.current = null;
          setHp(PLAYER_MAX_HP);
          setAlive(true);
          invulUntilRef.current = performance.now() / 1000 + PLAYER_INVUL_AFTER_RESPAWN;
          return 0;
        }
        return next;
      });
    }, 100);
    return () => {
      if (respawnTimerRef.current) clearInterval(respawnTimerRef.current);
    };
  }, [alive]);

  useEffect(() => {
    invulUntilRef.current = performance.now() / 1000 + PLAYER_INVUL_AFTER_RESPAWN;
  }, [player?.current_world]);

  const handleKillBunker = useCallback(async (x, z) => {
    const res = await recordKill(x, z);
    if (!res.error) refreshPlayer();
  }, [recordKill, refreshPlayer]);

  const handleKillAi = useCallback(async () => {
    const res = await recordAiKill();
    if (!res.error) refreshPlayer();
  }, [recordAiKill, refreshPlayer]);

  const handlePoseUpdate = useCallback((p) => {
    poseRef.current = { ...poseRef.current, ...p, hp };
  }, [hp]);

  const { remotePlayers } = useMultiplayer({
    worldId: player?.current_world || 'steppes',
    callsign: player?.callsign,
    faction: player?.faction,
    userId: session?.user?.id,
    poseRef,
  });

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
      <Game
        player={player}
        front={front}
        world={world}
        effects={effects}
        onKillBunker={handleKillBunker}
        onKillAi={handleKillAi}
        onPlayerDeath={handlePlayerDamage}
        remotePlayers={remotePlayers}
        alive={alive}
        hp={hp}
        scrap={player.scrap}
        onPoseUpdate={handlePoseUpdate}
      />
      <Hud
        player={player}
        front={front}
        world={world}
        effects={effects}
        hp={hp}
        alive={alive}
        respawnIn={respawnIn}
        remotePlayers={remotePlayers}
        leaderboard={leaderboard}
        onSignOut={handleSignOut}
        onOpenStore={() => setOverlay('store')}
        onOpenWorld={() => setOverlay('world')}
      />
      {overlay === 'store' && (
        <Store
          player={player}
          inventory={inventory}
          onBuy={async (id, cost) => { await buyItem(id, cost); }}
          onEquip={async (next) => { await setEquipped(next); }}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'world' && (
        <WorldPicker
          currentWorldId={player.current_world}
          allowCancel
          onCancel={() => setOverlay(null)}
          onPick={async (id) => {
            await setCurrentWorld(id);
            setHp(PLAYER_MAX_HP);
            setAlive(true);
            setOverlay(null);
          }}
        />
      )}
    </>
  );
}
