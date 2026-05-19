# Iron Front

> A dieselpunk armored combat game with a persistent 50-sector global front line.
> Two factions, one trench, one war — fought in real time by players the world over.

Tech: **Vite + React 18 + TypeScript + Three.js + react-three-fiber + cannon-es**.
Backend: **Supabase** (Postgres tables + RLS + Realtime + `SECURITY DEFINER` RPCs for anti-cheat + Edge Functions for optional integrations + pg_cron Sunday reset).

## What's in this build

- **Persistent global war** — 50 sectors arranged west-to-east. Sectors 0–24 start under the **Crimson Vanguard** (red), 25–49 under the **Iron Compact** (steel). The front line is the boundary between them; only sectors **adjacent** to the front can be contested.
- **Sunday reset (00:00 UTC)** via `pg_cron` — front returns to sector 25, the neutral midpoint.
- **Server-side hit validation** — clients propose hits, server reruns range / angle / armor / penetration math before applying damage. Anti-cheat by construction.
- **Authentication** — Supabase email auth. Players sign one-time enlistment papers (anonymous shadow-email under the hood) and pick a faction; **loyalty is locked permanently** after that.
- **Mobile Chrome support** — full touch controls in battle, virtual joystick + drag-aim + FIRE button, portrait → landscape rotate hint, hangar graphics tier selector.
- **Four pages**:
  - `/` — Briefing. Live war map preview (SVG strip with jagged red trench between factions). Enlistment form. Deploy-to-Front button.
  - `/warmap` — Full interactive 3D diorama of all 50 sectors, mini biome decorations per tile, click contested sectors to deploy. Live kill-feed ticker on the right.
  - `/barracks` — Service record, rank (Recruit → Sergeant → Major → General), medal collection, faction territory %, **hangar graphics-tier selector** (Low / Medium / High, persisted per device).
  - `/battle/:sectorIndex` — The actual fight: procedural terrain, you crew a land cruiser against an AI enemy cruiser.

## Run locally

```bash
cp .env.example .env   # fill in Supabase URL/key/prefix
npm install
npm run dev
```

Open `http://localhost:5173`.

## Controls

**Desktop (keyboard + mouse — unchanged):**

| Keys           | Action                       |
| -------------- | ---------------------------- |
| `W A S D`      | Drive the cruiser            |
| `Q E`          | Traverse the turret          |
| `R F`          | Elevate the main gun barrel  |
| `1 2 3`        | Select AP / HE / Smoke shell |
| `SPACE`        | Fire main gun                |

**Mobile (touch — Chrome on a phone, landscape recommended):**

| Region                              | Action                                              |
| ----------------------------------- | --------------------------------------------------- |
| Bottom-left virtual joystick        | Drive (forward/back) + steer (left/right)           |
| Right half of the screen (drag)     | Slew the turret. Drag up = barrel up; drag = yaw    |
| Bottom-right big red `FIRE` button  | Fire the currently selected shell                   |
| Ammo column left of `FIRE`          | Tap a row to select AP / HE / SM, or swipe up/down to cycle |

A "rotate your phone" hint appears on portrait; battle is intended for landscape. The
form / lobby pages work in either orientation. Inputs use Pointer Events under
the hood so desktop mouse + touch both work without separate code paths.

## Mobile performance knobs

The hangar settings in `/barracks` give you Low / Medium / High tiers, saved
per-device in `localStorage`:

| Tier   | DPR cap | Shadow map | Smoke noise | Ruins | Bloom |
| ------ | ------- | ---------- | ----------- | ----- | ----- |
| Low    | 1.0     | off        | 1 octave    | 14    | off   |
| Medium | ≤ 2.0   | 1024       | 1 octave    | 22    | on    |
| High   | 2.0     | 2048       | 2 octaves   | 36    | on    |

The build auto-picks Medium on mobile (UA + GPU vendor probe) and High on desktop.

## Architecture notes

### Shared Supabase, per-user prefix

This app lives in Gogi's **shared** Supabase project. All tables are prefixed
`usr_nmexs7bytxq2_*` so multiple Gogi apps share the same Postgres without
colliding. Frontend reads the prefix from `VITE_TABLE_PREFIX`.

### Anti-cheat = `SECURITY DEFINER` RPCs (with Edge Function alternative)

All authoritative game decisions run server-side:

- `usr_nmexs7bytxq2_validate_hit(...)` — recomputes range/LOS/impact-angle/penetration. Rejects shots with shallow ricochet angles or over-armored faces.
- `usr_nmexs7bytxq2_resolve_battle(...)` — applies the sector flip *only* if the winning faction has an adjacent sector. Re-marks the new front's neighbours as contested.
- `usr_nmexs7bytxq2_enlist_player(...)` — creates the player record and **locks faction loyalty** (no defectors).
- `usr_nmexs7bytxq2_weekly_reset()` — invoked by `pg_cron` every Sunday 00:00 UTC.

Equivalent Deno Edge Function source code is in `supabase/functions/` if you
prefer to deploy via the Supabase CLI.

### Realtime cruiser sync

`usr_nmexs7bytxq2_battles` is in the `supabase_realtime` publication so
each battle row supports realtime change feeds. The current build is
single-player vs AI; the netcode hooks for ~25Hz crew position sync are
scoped as a follow-up — see Roadmap below.

### Enlist hot-path optimization

The enlistment flow (anonymous Supabase user → confirm email → sign-in → enlist
RPC) used to land entirely on the user's "Enlist" tap, which on cold-cache
mobile Chrome added up to 5–10 seconds before the form became responsive.
This build:

1. **Pre-warms** anonymous sign-in as soon as the briefing page mounts.
   By the time a user has picked a faction and typed a callsign (~3–5s),
   the session is already live and tapping Enlist just runs the `enlist_player`
   RPC (~300 ms).
2. **Lazy-loads** the SVG war-strip preview and Recent Engagements components
   behind `React.Suspense` so the enlistment form is first in DOM order on
   mobile and tappable before the rest of the page paints.
3. **Defers the Realtime websocket subscribe** to `requestIdleCallback` so
   the handshake (300–1200 ms on 4G) can't push the form's mount past the
   first-paint budget.
4. **Index** on `players(faction_id)` for the territory-count / leaderboard
   queries that filter by faction.
5. **`console.time` markers** with the `[ironfront]` prefix in DevTools so
   future regressions show up clearly: `auth_bootstrap`, `prewarm_signin`,
   `sign_up`, `confirm_recruit`, `sign_in_password`, `enlist_rpc`,
   `enlist_total`, `load_war`, `realtime_subscribe`, `fetch_player`.

> 💡 **Tip — biggest single speedup**: enable **Anonymous sign-ins** in the
> Supabase Auth → Providers settings. The build feature-detects and uses the
> native one-roundtrip anonymous flow when enabled. That drops the
> sign-in step from ~3 s to ~500 ms.

## Roadmap (scoped follow-ups)

These pieces are explicitly out of scope for this PR and would
land in follow-up work:

- **Multi-crew per cruiser (driver + gunner + 2 MG + commander)** — current build puts the player in a single combined station. Roles + per-station HUDs (artificial horizon for driver, periscope for commander, MG hatch view) are designed; the per-role camera/control hot-swap is the missing piece. The MG-arc-limited drag-to-aim and the commander pinch-to-zoom periscope live here.
- **~25Hz realtime peer sync** — Supabase Realtime channels per battle room. State pack: position + yaw + turret-yaw + turret-pitch + speed + HP per cruiser, plus event packets for fire / hit / explode. Schema is already realtime-enabled.
- **Volumetric raymarched smoke** — current build uses GPU-friendly billboard puffs with a noise shader (the volumetric ray-marched version drops FPS sub-30 on integrated GPUs and the brief approves billboard as the cost-efficient analogue).
- **AI-generated radio bulletins between matches** — bulletin component scaffold exists; needs a backend prompt route to a model provider.
- **Per-sector weather effects** (rain → mud → slowdown, fog → engagement range, northern snow) — `BIOME_TUNING.mud` already affects acceleration; the per-frame weather particle systems are the missing pieces.

## Deploy

The repo ships with `.github/workflows/deploy.yml` that publishes `dist/`
to GitHub Pages on every push to `main`. Add the three secrets in
**Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TABLE_PREFIX`

Then in **Settings → Pages**, set **Source** to "GitHub Actions".
The live URL is `https://<user>.github.io/iron-front/`.

## License

MIT.
