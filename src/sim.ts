// Pure, deterministic rocket simulation. No canvas, no React, no wall-clock time:
// the same inputs always produce the same trajectory, so replays can be
// re-simulated from key changes instead of storing positions.

export type SimInput = {
  w: boolean
  a: boolean
  d: boolean
}

export type KeyChange = SimInput & {
  frame: number
}

export type RocketState = {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angularVelocity: number
}

export type SimPhysics = {
  startX: number
  startY: number
  gravity: number
  thrust: number
  turnThrust: number
  angularDamping: number
}

export type ReplayFrame = SimInput & {
  frame: number
  x: number
  y: number
  angle: number
}

export const createRocket = (physics: SimPhysics): RocketState => ({
  x: physics.startX,
  y: physics.startY,
  vx: 0,
  vy: 0,
  angle: 0,
  angularVelocity: 0,
})

export const normaliseAngle = (angle: number) => {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

export const stepRocket = (rocket: RocketState, input: SimInput, physics: SimPhysics) => {
  // vertical movement
  rocket.vy += physics.gravity
  if (input.w) {
    rocket.vx += Math.sin(rocket.angle) * physics.thrust
    rocket.vy -= Math.cos(rocket.angle) * physics.thrust
  }
  rocket.y += rocket.vy
  rocket.x += rocket.vx

  // rotation movement
  if (input.a) rocket.angularVelocity -= physics.turnThrust
  if (input.d) rocket.angularVelocity += physics.turnThrust
  rocket.angle += rocket.angularVelocity
  rocket.angle = normaliseAngle(rocket.angle)
  rocket.angularVelocity *= physics.angularDamping
}

// Rebuild a full per-frame replay from sparse key changes by re-running the sim.
// keyChanges must be in ascending frame order; each entry applies from its frame
// until the next entry.
export const simulateReplay = (
  keyChanges: KeyChange[],
  totalFrames: number,
  physics: SimPhysics
): ReplayFrame[] => {
  const rocket = createRocket(physics)
  const replay: ReplayFrame[] = []
  let input: SimInput = { w: false, a: false, d: false }
  let nextChange = 0

  for (let frame = 1; frame <= totalFrames; frame++) {
    while (nextChange < keyChanges.length && keyChanges[nextChange].frame <= frame) {
      const change = keyChanges[nextChange]
      input = { w: change.w, a: change.a, d: change.d }
      nextChange += 1
    }

    stepRocket(rocket, input, physics)
    replay.push({ frame, x: rocket.x, y: rocket.y, angle: rocket.angle, ...input })
  }

  return replay
}
