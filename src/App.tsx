import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { useEffect } from 'react';
import { useWarStore } from './lib/store';

function HeaderBar() {
  const { player, session, signOut } = useAuth();
  const loc = useLocation();
  const isBattle = loc.pathname.startsWith('/battle/');

  if (isBattle) return null;

  return (
    <header className="relative z-20 panel panel-rivets m-3 mb-0 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="6" fill="#141411" stroke="#b08d57" strokeWidth="2" />
            <path d="M8 32l16-16 8 8 8-8 16 16-16 16-8-8-8 8z" fill="#c0392b" stroke="#7a1f17" />
            <circle cx="32" cy="32" r="4" fill="#b08d57" />
          </svg>
          <div className="leading-tight">
            <div className="stencil text-brass-light text-lg">IRON FRONT</div>
            <div className="text-[10px] text-steel-300 tracking-widest">— FRONT COMMAND —</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <NavTab to="/">Briefing</NavTab>
          <NavTab to="/warmap">War Map</NavTab>
          <NavTab to="/barracks">Barracks</NavTab>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {player ? (
          <>
            <div className="text-right leading-tight">
              <div className="stencil text-brass-light text-sm">{player.callsign}</div>
              <div className="text-[10px] text-steel-200 tracking-wider">
                {player.rank} · {player.cruisers_destroyed} ARMOR KILLS
              </div>
            </div>
            <button className="btn-brass !py-1.5 !px-3 !text-xs" onClick={signOut}>Stand Down</button>
          </>
        ) : session ? (
          <span className="text-steel-200 text-xs">Pending enlistment</span>
        ) : (
          <span className="text-steel-300 text-xs">— No Identity —</span>
        )}
      </div>
    </header>
  );
}

function NavTab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 text-xs uppercase tracking-widest border-b-2 transition-colors ${
          isActive
            ? 'text-brass-light border-brass'
            : 'text-steel-200 border-transparent hover:text-brass-light hover:border-brass-dark'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function WarLoader() {
  const { loadWar, subscribe } = useWarStore();
  useEffect(() => {
    loadWar();
    const unsub = subscribe();
    return unsub;
  }, [loadWar, subscribe]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <WarLoader />
      <div className="relative z-10 min-h-full flex flex-col">
        <HeaderBar />
        <main className="flex-1 relative">
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
}
