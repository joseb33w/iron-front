import { WORLD_LIST } from '../game/worlds';

export default function WorldPicker({ currentWorldId, onPick, onCancel, allowCancel = false }) {
  return (
    <div className="fullscreen-bg">
      <div className="card card-wide">
        <h1>Choose Battlefield</h1>
        <p className="sub">Every front shares the same global score line.</p>

        <div className="world-grid">
          {WORLD_LIST.map((w) => (
            <div
              key={w.id}
              className={`world-card ${currentWorldId === w.id ? 'selected' : ''} world-${w.id}`}
              onClick={() => onPick(w.id)}
              role="button"
              tabIndex={0}
              data-testid={`world-${w.id}`}
            >
              <div className="world-thumb" style={{ background: thumbBg(w) }}>
                <span className="world-emblem" style={{ color: w.accent }}>{worldGlyph(w.id)}</span>
              </div>
              <div className="world-body">
                <div className="world-name" style={{ color: w.accent }}>{w.name}</div>
                <div className="world-tag">{w.tagline}</div>
              </div>
            </div>
          ))}
        </div>

        {allowCancel && (
          <div className="btn-row" style={{ marginTop: 18 }}>
            <button className="btn ghost" onClick={onCancel} data-testid="cancel-world">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function worldGlyph(id) {
  if (id === 'steppes') return '☉';
  if (id === 'foundry') return '⚒';
  if (id === 'glacier') return '❄';
  return '◌';
}

function thumbBg(w) {
  const a = w.accent;
  const g = w.ground.color;
  return `linear-gradient(160deg, ${a}33 0%, ${g}cc 50%, #0c0a08 100%)`;
}
