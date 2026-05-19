import { useEffect, useRef, useState, PointerEvent as RPointerEvent } from 'react';

// Mobile-only touch input layer that drives the same battle input state
// the keyboard handlers write into.
//
// - Left bottom: virtual analog joystick (driver). thumb deflection
//   sets fwd ∈ [-1, 1] and turn ∈ [-1, 1].
// - Right half of screen: drag = turret slew (gunner).
//   delta.x → turretYaw, delta.y → turretPitch.
//   tap on the FIRE button = main gun fire.
//   swipe up/down on the ammo column = cycle AP / HE / SMOKE.
//
// Pointer Events so the same component handles touch, mouse, and pen.
// We never preventDefault on the document — we only preventDefault on
// our own gesture surfaces, so the rest of the page (the rotate hint,
// any overlay buttons) stays scrollable / tappable.

export type TouchInputState = {
  fwd: number;        // -1..1
  turn: number;       // -1..1
  turretYawDelta: number;   // accumulated; consumer drains per-frame
  turretPitchDelta: number; // accumulated; consumer drains per-frame
  fire: boolean;
};

type Props = {
  onFire: () => void;
  inventory: { AP: number; HE: number; SMOKE: number };
  selectedShell: 'AP' | 'HE' | 'SMOKE';
  setSelectedShell: (s: 'AP' | 'HE' | 'SMOKE') => void;
  setInput: (patch: Partial<TouchInputState>) => void;
  consumeAimDeltas: () => { yaw: number; pitch: number };
};

const SHELL_CYCLE: ('AP' | 'HE' | 'SMOKE')[] = ['AP', 'HE', 'SMOKE'];

export function TouchControls({
  onFire, inventory, selectedShell, setSelectedShell, setInput,
}: Props) {
  return (
    <>
      <Joystick setInput={setInput} />
      <AimSurface setInput={setInput} />
      <FireButton onFire={onFire} count={inventory[selectedShell]} />
      <AmmoColumn inventory={inventory} selected={selectedShell} setSelected={setSelectedShell} cycle={() => {
        const i = SHELL_CYCLE.indexOf(selectedShell);
        setSelectedShell(SHELL_CYCLE[(i + 1) % SHELL_CYCLE.length]);
      }} />
    </>
  );
}

function Joystick({ setInput }: { setInput: (p: Partial<TouchInputState>) => void }) {
  const padRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const R = 60; // px radius of the pad

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (activeId.current !== null) return;
    e.preventDefault();
    activeId.current = e.pointerId;
    try { padRef.current?.setPointerCapture(e.pointerId); } catch {}
    update(e);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return;
    e.preventDefault();
    update(e);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    setThumb({ x: 0, y: 0 });
    setInput({ fwd: 0, turn: 0 });
  };
  const update = (e: RPointerEvent<HTMLDivElement>) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
    setThumb({ x: dx, y: dy });
    // dy < 0 = thumb up = forward
    setInput({ fwd: -dy / R, turn: -dx / R });
  };

  return (
    <div
      ref={padRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="touch-joystick pointer-events-auto"
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(176,141,87,0.18), rgba(20,20,17,0.55) 70%)',
        border: '2px solid rgba(176,141,87,0.55)',
        touchAction: 'none',
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.5)',
        zIndex: 41,
      }}
      aria-label="Drive joystick"
    >
      <div
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: 60, height: 60,
          marginLeft: -30 + thumb.x,
          marginTop: -30 + thumb.y,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #d4af6a, #7a5b30)',
          border: '2px solid #1a1a17',
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', top: -22, left: 0, right: 0,
        textAlign: 'center', fontSize: 10, letterSpacing: 2,
        color: '#d4af6a', textTransform: 'uppercase',
        fontFamily: '"Black Ops One", Impact, sans-serif',
      }}>Drive</div>
    </div>
  );
}

function AimSurface({ setInput }: { setInput: (p: Partial<TouchInputState>) => void }) {
  const surfRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (activeId.current !== null) return;
    e.preventDefault();
    activeId.current = e.pointerId;
    lastPt.current = { x: e.clientX, y: e.clientY };
    try { surfRef.current?.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return;
    e.preventDefault();
    const last = lastPt.current;
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    // Yaw: drag right = turret right. Pitch: drag up = barrel up.
    // The Battle scene drains these per-frame.
    setInput({
      turretYawDelta: dx * -0.005,
      turretPitchDelta: dy * -0.0035,
    });
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    lastPt.current = null;
  };

  return (
    <div
      ref={surfRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        right: 0, top: 0,
        width: '50%', height: '100%',
        touchAction: 'none',
        zIndex: 35,
      }}
      aria-label="Aim turret"
    />
  );
}

function FireButton({ onFire, count }: { onFire: () => void; count: number }) {
  const [hot, setHot] = useState(false);
  const onDown = (e: RPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setHot(true);
    if (count > 0) onFire();
  };
  const onUp = () => setHot(false);
  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      disabled={count === 0}
      className="pointer-events-auto touch-fire-btn"
      style={{
        position: 'absolute',
        right: 24,
        bottom: 28,
        width: 110,
        height: 110,
        borderRadius: '50%',
        background: hot
          ? 'radial-gradient(circle, #ff5040, #7a1f17)'
          : 'radial-gradient(circle, #c0392b, #4a1108)',
        border: '3px solid #d4af6a',
        color: '#fff7d8',
        fontFamily: '"Black Ops One", Impact, sans-serif',
        fontSize: 18,
        letterSpacing: 3,
        boxShadow: hot
          ? '0 0 32px rgba(255,80,64,0.85), inset 0 0 16px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.6), inset 0 0 16px rgba(0,0,0,0.4)',
        touchAction: 'none',
        cursor: count > 0 ? 'pointer' : 'not-allowed',
        opacity: count > 0 ? 1 : 0.4,
        zIndex: 41,
      }}
      aria-label="Fire main gun"
    >
      FIRE
    </button>
  );
}

function AmmoColumn({
  inventory, selected, setSelected, cycle,
}: {
  inventory: { AP: number; HE: number; SMOKE: number };
  selected: 'AP' | 'HE' | 'SMOKE';
  setSelected: (s: 'AP' | 'HE' | 'SMOKE') => void;
  cycle: () => void;
}) {
  // Vertical column to the LEFT of the fire button on mobile.
  // Tap a row to select that shell. Swipe up/down on the column = cycle.
  const colRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number } | null>(null);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    start.current = { y: e.clientY, t: performance.now() };
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dy = e.clientY - s.y;
    const dt = performance.now() - s.t;
    // Tap (small dy, short time): rely on per-row buttons. Swipe up/down: cycle.
    if (Math.abs(dy) > 36 && dt < 600) {
      cycle();
    }
  };

  const rows: { code: 'AP' | 'HE' | 'SMOKE'; color: string }[] = [
    { code: 'AP', color: '#d4af6a' },
    { code: 'HE', color: '#ff6020' },
    { code: 'SMOKE', color: '#aaaaaa' },
  ];

  return (
    <div
      ref={colRef}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        right: 148,
        bottom: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        touchAction: 'none',
        zIndex: 41,
      }}
      aria-label="Select shell — swipe up/down to cycle"
    >
      {rows.map((r) => {
        const isSel = selected === r.code;
        const empty = inventory[r.code] === 0;
        return (
          <button
            key={r.code}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onPointerUp={(e) => { e.stopPropagation(); if (!empty) setSelected(r.code); }}
            disabled={empty}
            style={{
              minWidth: 56,
              minHeight: 44,
              padding: '4px 8px',
              borderRadius: 8,
              background: isSel ? `${r.color}22` : 'rgba(20,20,17,0.65)',
              border: `2px solid ${isSel ? r.color : 'rgba(176,141,87,0.5)'}`,
              color: r.color,
              fontFamily: '"Black Ops One", Impact, sans-serif',
              fontSize: 12,
              letterSpacing: 1,
              textAlign: 'center',
              opacity: empty ? 0.35 : 1,
              touchAction: 'none',
            }}
          >
            <div>{r.code === 'SMOKE' ? 'SM' : r.code}</div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>{inventory[r.code]}</div>
          </button>
        );
      })}
    </div>
  );
}

// Hook the consumer Battle uses to wire the touch input into the existing
// per-frame input state. Returns a controlled object you can patch.
export function useTouchInputState(): {
  state: TouchInputState;
  patch: (p: Partial<TouchInputState>) => void;
  consumeAimDeltas: () => { yaw: number; pitch: number };
} {
  const stateRef = useRef<TouchInputState>({
    fwd: 0, turn: 0, turretYawDelta: 0, turretPitchDelta: 0, fire: false,
  });
  const patch = (p: Partial<TouchInputState>) => {
    if (p.turretYawDelta !== undefined) {
      stateRef.current.turretYawDelta += p.turretYawDelta;
    }
    if (p.turretPitchDelta !== undefined) {
      stateRef.current.turretPitchDelta += p.turretPitchDelta;
    }
    if (p.fwd !== undefined) stateRef.current.fwd = p.fwd;
    if (p.turn !== undefined) stateRef.current.turn = p.turn;
    if (p.fire !== undefined) stateRef.current.fire = p.fire;
  };
  const consumeAimDeltas = () => {
    const out = { yaw: stateRef.current.turretYawDelta, pitch: stateRef.current.turretPitchDelta };
    stateRef.current.turretYawDelta = 0;
    stateRef.current.turretPitchDelta = 0;
    return out;
  };
  return { state: stateRef.current, patch, consumeAimDeltas };
}

// Rotate-your-phone hint shown on portrait mobile during battle.
export function RotateHint() {
  const [portrait, setPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(orientation: portrait)').matches ?? false;
  });

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (!portrait) return null;

  return (
    <div
      className="rotate-hint"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,8,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        zIndex: 100,
        color: '#d4af6a',
        fontFamily: '"Black Ops One", Impact, sans-serif',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <svg width="120" height="120" viewBox="0 0 64 64" aria-hidden>
        <g fill="none" stroke="#d4af6a" strokeWidth="2.5">
          <rect x="22" y="6" width="20" height="34" rx="3" />
          <circle cx="32" cy="36" r="1.5" fill="#d4af6a" />
        </g>
        <g transform="rotate(80 32 32)" opacity="0.5">
          <rect x="22" y="6" width="20" height="34" rx="3" fill="none" stroke="#7a5b30" strokeWidth="2" strokeDasharray="3 2" />
        </g>
        <path d="M 6 50 Q 32 60 58 50" fill="none" stroke="#b08d57" strokeWidth="2" />
        <path d="M 56 48 L 60 50 L 56 53 Z" fill="#b08d57" />
      </svg>
      <div style={{ fontSize: 22, letterSpacing: 4 }}>ROTATE YOUR PHONE</div>
      <div style={{ fontSize: 12, color: '#a8a79f', letterSpacing: 2, maxWidth: 280 }}>
        Battle is fought landscape — turret slew and joystick need the room.
      </div>
    </div>
  );
}
