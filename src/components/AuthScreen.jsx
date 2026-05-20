import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created. You are signed in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fullscreen-bg">
      <div className="card">
        <h1>Iron Front</h1>
        <p className="sub">Dieselpunk front-line warfare</p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="commander@front.line"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="error">{error}</div>}
          {info && <div className="error" style={{ color: '#a8e3c1', borderColor: 'rgba(120,220,160,0.4)', background: 'rgba(120,220,160,0.1)' }}>{info}</div>}

          <div style={{ marginTop: 14 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Working…' : mode === 'signup' ? 'Enlist' : 'Report for Duty'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {mode === 'signin' ? (
            <span style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              New here?{' '}
              <button className="link" onClick={() => { setMode('signup'); setError(null); setInfo(null); }}>
                Enlist now
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              Already enlisted?{' '}
              <button className="link" onClick={() => { setMode('signin'); setError(null); setInfo(null); }}>
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
