# Rocket Catch — Dev Log

A running log of what I build and what I learn. Newest entry on top.
Each entry: **Built** (what I made), **Learned** (concepts / gotchas), **Next** (where I'm headed).

---

## Roadmap

1. Manual landing core: start position, HUD/messages, landing pad rules, reset.
2. Game feel: tune gravity, thrust, turn speed, damping.
3. Challenge: random starts, narrower pad, fuel, scoring.
4. AI training environment: expose state, actions (`w`, `a`, `d`), rewards, reset loop.
5. Autopilot/model training: target error, velocity correction, angle/thrust control.
6. Catch tower: design a 2D catch zone once the landing/training loop is solid.

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
