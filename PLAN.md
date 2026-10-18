# Goal

Add a new usable weapon to Iron Front: the **Siege Mortar** — a Quartermaster weapon that, once bought and equipped, replaces the main gun's flat shell with a lobbed, arcing round that detonates on ground impact and splashes every bunker and enemy tank near the crater. Fired with the same Space / Fire-button verb (keyboard and touch), with its own slower reload shown on the HUD.

# Files to touch

- `src/game/store.js` — new `wpn_mortar` catalog entry; `combineEffects` gains a `weaponMode` key.
- `src/game/gameState.js` — mortar ballistics / splash / damage / reload constants.
- `src/game/Game.jsx` — mortar firing, arc integration, ground-impact splash vs bunkers + AI tanks, in-flight shell visual, bigger explosion, reload-state callback; pass the equipped weapon to the player `Tank` so its barrel changes.
- `src/game/Tank.jsx` — mortar barrel (short, thick, elevated tube).
- `src/game/Explosion.jsx` — `size` prop for the larger mortar burst.
- `src/components/Hud.jsx`, `src/App.jsx`, `src/styles.css` — reload indicator on the fire button + help text.
- `README.md` — document the weapon.

# Verification approach

- `npm run build` (Vite) with the source `index.html` restored, as CI does.
- Headless Chromium (Playwright, outside the repo) against the built bundle talking to the REAL Supabase project: sign in as a test account that owns + has equipped `wpn_mortar` (purchase exercised via the live `buy_item` RPC), drive toward the enemy line, fire, and assert from the hidden test inputs that shells are fired, that a mortar round's height rises then falls (arc), that `ai-hits` / `bunker-hits` increase on impact, and that the reload indicator toggles. Screenshots of the arc + burst.
- Keyboard and touch fire paths both drive the same mortar.

# Out of scope

- Any database / RPC change (this build has no DB access). The `buy_item` RPC already accepts the new item id.
- Fixing the pre-existing RLS hole that lets a client update its own `scrap` (flagged in the PR body).
- Syncing shells / mortar rounds to remote players (the multiplayer layer only syncs tank pose today).
