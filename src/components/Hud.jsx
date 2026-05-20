import { useEffect, useRef, useState } from 'react';
import { ITEM_BY_ID } from '../game/store';
import { PLAYER_MAX_HP } from '../game/gameState';

function Joystick({ onMove }) {
  const baseRef = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!stick.active && (stick.x !== 0 || stick.y !== 0)) onMove(0, 0);
  }, [stick.active, stick.x, stick.y, onMove]);

  function handle(e) {
    e.preventDefault();
    const r = baseRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const t = e.touches?.[0] ?? e;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const maxR = r.width / 2 - 18;
    const d = Math.hypot(dx, dy);
    if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
    setStick({ x: dx, y: dy, active: true });
    onMove(-dy / maxR, -dx / maxR);
  }
  function end() { setStick({ x: 0, y: 0, active: false }); onMove(0, 0); }

  return (
    <div
      className="joystick"
      ref={baseRef}
      onTouchStart={handle}
      onTouchMove={handle}
      onTouchEnd={end}
      onTouchCancel={end}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => { if (e.buttons) handle(e); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="stick" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
    </div>
  );
}

export default function Hud({ player, front, world, effects, hp, alive, respawnIn, remotePlayers, onSignOut, leaderboard, onOpenStore, onOpenWorld }) {
  const handleMove = (forward, turn) => {
    if (window.__ironMobile) window.__ironMobile.setMove(forward, turn);
  };
  const handleFire = () => {
    if (window.__ironMobile) window.__ironMobile.fire();
  };

  const markerLeftPct = `${Math.round(front.position * 100)}%`;
  const factionLabel = player.faction === 'iron' ? 'Iron Order' : 'Steam Coalition';
  const factionClass = player.faction;
  const factionEmblem = player.faction === 'iron' ? '⚙' : '✦';
  const hpPct = Math.max(0, Math.min(1, hp / PLAYER_MAX_HP));

  return (
    <div className="hud">
      <div className="top-bar">
        <div className="top-left">
          <span className={`pill ${factionClass}`} data-testid="hud-faction">
            <span style={{ fontSize: 16 }}>{factionEmblem}</span>
            <strong>{player.callsign}</strong>
            <span>·</span>
            <span>{factionLabel}</span>
          </span>
          <button className="menu-btn world-btn" onClick={onOpenWorld} data-testid="open-world" title="Change world">
            <span style={{ color: world.accent, marginRight: 6 }}>◌</span>
            {world.name}
          </button>
        </div>

        <div className="front-bar">
          <div className="labels">
            <span className="iron-label">⚙ Iron</span>
            <span>Front Line</span>
            <span className="steam-label">Steam ✦</span>
          </div>
          <div className="track">
            <div className="marker" style={{ left: markerLeftPct }} />
          </div>
          <div className="scores">
            <span className="iron-s" data-testid="iron-score">{front.iron_score}</span>
            <span className="steam-s" data-testid="steam-score">{front.steam_score}</span>
          </div>
        </div>

        <div className="top-right">
          <span className="pill scrap" data-testid="hud-scrap">
            <span className="scrap-icon">⛯</span>
            <strong>{player.scrap ?? 0}</strong>
          </span>
          <button className="menu-btn" onClick={onOpenStore} data-testid="open-store">Store</button>
          <button className="menu-btn" onClick={onSignOut} data-testid="signout">Sign Out</button>
        </div>
      </div>

      <div className="hp-area">
        <div className="hp-row" data-testid="hp-row">
          <span className="hp-label">ARMOR</span>
          <div className="hp-track">
            <div className="hp-fill" style={{ width: `${hpPct * 100}%`, background: hpPct > 0.55 ? 'linear-gradient(90deg, #7cf07a 0%, #5cf07a 100%)' : hpPct > 0.25 ? 'linear-gradient(90deg, #ffcb50 0%, #ffa040 100%)' : 'linear-gradient(90deg, #ff5a3d 0%, #e3573d 100%)' }} />
          </div>
          <span className="hp-num">{Math.round(hp)}/{PLAYER_MAX_HP}</span>
        </div>
        <div className="equipped-row">
          {(player.equipped || []).map((id) => {
            const item = ITEM_BY_ID[id];
            if (!item) return null;
            return (
              <span key={id} className="equipped-chip" style={{ borderColor: item.color }}>
                <span style={{ color: item.color, fontSize: 16 }}>{item.emblem}</span>
                <span>{item.name}</span>
              </span>
            );
          })}
        </div>
      </div>

      <Leaderboard rows={leaderboard} onlineCount={remotePlayers.length + 1} />

      {effects.radar && (
        <Minimap world={world} remotePlayers={remotePlayers} />
      )}

      {!alive && (
        <div className="respawn-modal" data-testid="respawn-modal">
          <div className="card">
            <h1>Vehicle Destroyed</h1>
            <p className="sub" style={{ marginBottom: 6 }}>Respawning in {Math.ceil(respawnIn)}s…</p>
            <div className="respawn-bar">
              <div className="respawn-fill" style={{ width: `${(1 - respawnIn / 3) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="touch-controls">
        <Joystick onMove={handleMove} />
        <button
          className="fire-btn"
          onTouchStart={(e) => { e.preventDefault(); handleFire(); }}
          onMouseDown={(e) => { e.preventDefault(); handleFire(); }}
          aria-label="Fire"
        >
          Fire
        </button>
      </div>

      <div className="help">WASD to drive · Space to fire · {remotePlayers.length} other commander{remotePlayers.length === 1 ? '' : 's'} on this front</div>
    </div>
  );
}

function Leaderboard({ rows, onlineCount }) {
  if (!rows?.length) return null;
  return (
    <div className="leaderboard" data-testid="leaderboard">
      <h3>
        Top Pilots
        <span className="online-dot">● {onlineCount}</span>
      </h3>
      <ol>
        {rows.map((r, i) => (
          <li key={`${r.callsign}-${i}`}>
            <span className="callsign">
              <span className={`dot ${r.faction}`} />
              {r.callsign}
            </span>
            <span className="kills">{r.total_kills}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Minimap({ world, remotePlayers }) {
  const size = 180;
  const scale = size / 160;
  return (
    <div className="minimap" data-testid="minimap">
      <div className="minimap-frame">
        <div className="minimap-self" style={{ left: size / 2, top: size / 2 }} />
        {remotePlayers.map((r) => (
          <div
            key={r.key}
            className={`minimap-dot ${r.faction}`}
            style={{ left: size / 2 + r.x * scale * 0.5, top: size / 2 + r.z * scale * 0.5 }}
          />
        ))}
      </div>
      <div className="minimap-label">RADAR</div>
    </div>
  );
}
