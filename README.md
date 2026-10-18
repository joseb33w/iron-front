# Iron Front

A dieselpunk armored ground combat game with a persistent global front line.

Built with [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Supabase](https://supabase.com/).

## What you do

Enlist with one of two factions — the **Iron Order** (brass and oil, north) or the **Steam Coalition** (smoke and storm, south) — pick a callsign, and deploy to the front. Drive your tank into the no-man's-land, shell the enemy bunkers, and push the global front line toward the opposing capital. The line is shared across every player in real time: every kill anywhere in the world nudges it.

## Controls

- **W / S** — forward / reverse
- **A / D** — turn left / right
- **Space** — fire main gun
- **Touch** — joystick (left) to drive, fire button (right)

## Weapons

Weapons are bought once with scrap at the **Quartermaster** (the Store button) and then equipped — up to three items at a time. Space / the fire button always fires whatever is equipped.

- **Rapid Cannon** — halved cooldown between shots.
- **Dual Cannons** — two parallel shells per shot.
- **Missile Launcher** — slower reload, splash damage on tanks.
- **Siege Mortar** — indirect fire. Point roughly at the enemy and fire: the tube auto-ranges onto the nearest bunker or tank within 60 m in a 30° cone ahead of you and lobs a heavy round onto it (no target in the cone → a max-range lob straight ahead). It detonates on impact and splashes every bunker and enemy tank near the crater. Slow reload — the fire button reads *Loading* until the tube is ready.

## Tech

- **Frontend** — Vite + React 18, R3F + drei for the 3D scene, vanilla CSS for the HUD.
- **Backend** — Supabase Postgres for player profiles, the global front-line singleton, and the kill log. Auth via Supabase Auth (email + password). Real-time updates via Supabase Realtime channels.
- **Front-line state** — single Postgres row updated atomically by a `record_kill` RPC, with RLS preventing unauthenticated writes. Iron kills push the position toward 1.0; Steam kills push toward 0.0.

## Run locally

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TABLE_PREFIX
npm run dev
```

Open <http://localhost:5173/>.

## Build

```bash
npm run build      # output to dist/
npm run preview    # serve dist/ on http://localhost:4173/
```

## License

MIT — see [LICENSE](./LICENSE).
