import { useEffect, useRef, useState } from 'react';

function Joystick({ onMove }) {
  const baseRef = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    function emit(x, y) {
      // x = right (turn), y = up (forward)
      // map to forward, turn:
      onMove(-y, -x);
    }
    if (!stick.active && (stick.x !== 0 || stick.y !== 0)) emit(0, 0);
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
    const nx = dx / maxR;
    const ny = dy / maxR;
    onMove(-ny, -nx);
  }

  function end() {
    setStick({ x: 0, y: 0, active: false });
    onMove(0, 0);
  }

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

export default function Hud({ player, front, onSignOut, leaderboard }) {
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

  return (
    <div className="hud">
      <div className="top-bar">
        <span className={`pill ${factionClass}`} data-testid="hud-faction">
          <span style={{ fontSize: 16 }}>{factionEmblem}</span>
          <strong>{player.callsign}</strong>
          <span>·</span>
          <span>{factionLabel}</span>
        </span>

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

        <button className="menu-btn" onClick={onSignOut} data-testid="signout">Sign Out</button>
      </div>

      <Leaderboard rows={leaderboard} />

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

      <div className="help">WASD to drive · Space to fire</div>
    </div>
  );
}

function Leaderboard({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="leaderboard" data-testid="leaderboard">
      <h3>Top Pilots</h3>
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
