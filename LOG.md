# Rocket Catch — Dev Log

A running log of what I build and what I learn. Newest entry on top.
Each entry: **Built** (what I made), **Learned** (concepts / gotchas), **Next** (where I'm headed).

---

## Roadmap

### Done
- Manual landing core: start position, HUD/messages, landing pad rules, reset.
- Input feedback: draw on-screen `W`, `A`, `D` keys and highlight held keys.
- Level 1 config: define start position, pad position, physics values, and landing thresholds in one place.

### Next
- Attempt recording: record frame count, outcome, landing time, fail reason, and key holds.
- Progress stats: success rate, best landing time, attempts per level.
- Ghost replay: replay a previous successful attempt against the current run.

### Later
- Levels: add multiple starts, pads, and difficulty settings.
- Backend: use Convex to store attempts, level results, ghosts, and leaderboard entries.
- Auth: add Clerk so attempts and ghosts belong to users.
- Leaderboards: fastest/smoothest landings per level.
- AI training environment: expose state, actions (`w`, `a`, `d`), rewards, reset loop, and recorded human attempts.
- Autopilot/model training: target error, velocity correction, angle/thrust control.
- Catch tower: design a 2D catch zone once the landing/training loop is solid.

### Code review todos (2026-07-01)
- [x] Frame-rate independent physics: step the sim at a fixed 60Hz with an accumulator so gravity and leaderboard times match across 60/120/144Hz displays. (implemented 2026-07-01)
- [x] Ghost flames: `drawRocket` reads the live `keys` set, so the ghost fires its engine when the player presses W — replay the ghost's own `keyFrames` instead. (implemented 2026-07-01)
- [ ] Replay payload size: `keyFrames`/`replayFrames` store an entry every frame (~7,200 objects per minute; Convex docs cap at 1MB) — record key *changes* only, and consider re-simulating replays from inputs instead of storing positions.
- [ ] Leaderboard dedupe: it currently shows top 10 *attempts*, not players, so one player can fill every slot. Also the query does `take(10)` but the UI does `slice(0, 5)`.
- [ ] Anti-cheat: `attempts.save` trusts whatever the client sends — validate claimed times server-side by re-simulating from `keyFrames` (needs the deterministic sim above).
- [ ] Small fixes: pad centering uses a hardcoded `- 75` instead of `padWidth / 2`; magic `+ 20` nozzle offset in the collision check; no window-resize handling.

---

## 2026-06-25 — Session 1: from blank canvas to a falling, thrustable rocket

### Built
- Scaffolded the project: Vite + React + TypeScript, using Bun (`bun create vite rocket-catch-react --template react-ts`).
- Drew the rocket on a `<canvas>`: dark background, body (rect), nose cone (triangle path), engine nozzle, flame.
- Pulled hardcoded numbers into variables: `rocketX`, `rocketY`, `rocketWidth`, `rocketHeight`.
- Built the animation loop with `requestAnimationFrame` (clear → update → draw → repeat).
- Added gravity: a velocity `vy` and a `gravity` constant — `vy += gravity`, then `rocketY += vy`.
- Added thrust: `keydown`/`keyup` listeners + a `keys` Set; hold `w` to push up (`vy -= thrust`).
- Added `useEffect` cleanup: `removeEventListener` for both handlers + `cancelAnimationFrame`.
- Made the canvas fill the window (`canvas.width = window.innerWidth`, same for height).
- Added a live HUD in the top-right showing `vy` and `y` via `ctx.fillText`.
- Wrote `CLAUDE.md` with teaching-mode rules (go slow, one concept, don't write my code for me).

### Learned
- **`let` vs `const`**: `const` for things that never change (`ctx`, `gravity`, `thrust`); `let` for things that do (`rocketY`, `vy`, `frameId`). A `const` Set is fine — I mutate its *contents*, not the variable.
- **TS narrowing across closures** (the big one): `if (!ctx) return` narrows `ctx` to non-null, and that narrowing flows into **arrow functions** created after the guard — but NOT into hoisted **`function` declarations** (they're lifted above the guard, so TS assumes they could run before it). Fix: write canvas helpers as `const draw = () => {}`.
- **Canvas has two sizes**: the *drawing buffer* (the `width`/`height` attributes = real pixel grid) vs the *CSS display size*. Filling the window with CSS just stretches the small bitmap (blurry); setting the buffer to `window.innerWidth/Height` gives real, crisp pixels.
- Assigning to `canvas.width`/`canvas.height` **wipes the canvas and resets context state** (fillStyle, etc.).
- **Animation = redraw every frame.** `requestAnimationFrame(loop)` must be called *inside* `loop` to repeat. Forgetting `drawBackground()` leaves a smear/trail because old frames are never cleared.
- **Physics model**: position ← velocity ← acceleration. `gravity` is in px/frame², a tuning knob — real `9.81` is m/s² and far too big here (~60 frames/sec).
- **Event handlers** receive an event argument: `(e: KeyboardEvent) => ...`, read `e.key`. Standalone handlers need the type annotation (no contextual inference). `removeEventListener` needs the **same named function reference** — you can't remove an inline arrow.
- **StrictMode runs effects twice in dev** on purpose — without cleanup, listeners and the rAF loop get doubled.
- **`fillText`**: `y` is the text *baseline*, not the top. `textAlign = 'right'` makes `x` the right edge. The canvas context is stateful, so `textAlign` persists to later draws.

### Next
- Make the canvas follow window **resize** (resize listener + cleanup — reuse the pattern I just learned).
- Build the **catch tower / chopsticks**.
- **Collision / landing detection** + a soft-landing check (fail if `vy` too high on contact).
- Maybe rocket **rotation/angle** and horizontal control.
