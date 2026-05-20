import { useState } from 'react';

export default function FactionPicker({ session, onCreate }) {
  const defaultCallsign = () => {
    const email = session?.user?.email || '';
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return (base || 'Pilot') + Math.floor(Math.random() * 90 + 10);
  };
  const [callsign, setCallsign] = useState(defaultCallsign);
  const [faction, setFaction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!faction) { setError('Pick a faction.'); return; }
    if (!callsign.trim()) { setError('Pick a callsign.'); return; }
    setBusy(true);
    const { error } = await onCreate({ callsign: callsign.trim().slice(0, 24), faction });
    if (error) { setError(error); setBusy(false); }
  }

  return (
    <div className="fullscreen-bg">
      <div className="card">
        <h1>Choose Your Side</h1>
        <p className="sub">Once you enlist, your faction stays.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="callsign">Callsign</label>
            <input
              id="callsign"
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              maxLength={24}
              placeholder="Your war name"
            />
          </div>

          <div className="faction-grid">
            <div
              className={`faction-card iron ${faction === 'iron' ? 'selected' : ''}`}
              onClick={() => setFaction('iron')}
              role="button"
              tabIndex={0}
              data-testid="faction-iron"
            >
              <div className="emblem" style={{ color: 'var(--iron)' }}>⚙</div>
              <div className="name">Iron Order</div>
              <span className="tag">Brass &amp; Oil · North</span>
            </div>
            <div
              className={`faction-card steam ${faction === 'steam' ? 'selected' : ''}`}
              onClick={() => setFaction('steam')}
              role="button"
              tabIndex={0}
              data-testid="faction-steam"
            >
              <div className="emblem" style={{ color: 'var(--steam)' }}>✦</div>
              <div className="name">Steam Coalition</div>
              <span className="tag">Smoke &amp; Storm · South</span>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div style={{ marginTop: 14 }}>
            <button
              className={`btn ${faction === 'steam' ? 'steam' : ''}`}
              type="submit"
              disabled={busy || !faction}
              data-testid="enlist-submit"
            >
              {busy ? 'Enlisting…' : 'Deploy to Front'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
