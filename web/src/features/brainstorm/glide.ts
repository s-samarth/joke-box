/**
 * A flick keeps the page moving after the finger lifts, slowing down the way iOS scrolling does.
 * The handwriting page scrolls itself (the browser's own scrolling would let the Pencil scroll
 * too), so it needs its own momentum.
 */
export type Sample = { t: number; x: number; y: number }

/** How far back the finger's speed is measured, in ms. */
const RECENT_MS = 100
/** Speed kept per millisecond: iOS's normal scroll deceleration. */
const DECELERATION = 0.998
/** Under this (px per ms) the page stops. */
const STOP_SPEED = 0.02
const MAX_SPEED = 8

/** How fast to keep scrolling when the finger lifts (px per ms), or null to stop where it is. */
export function flingVelocity(trail: Sample[], now: number) {
  const recent = trail.filter((s) => now - s.t <= RECENT_MS)
  const first = recent[0]
  const last = recent.at(-1)
  // Held still a moment before lifting: no fling.
  if (!first || !last || first === last || now - last.t > 50) return null
  const dt = Math.max(1, last.t - first.t)
  const clamp = (v: number) => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v))
  // The page scrolls the opposite way to the finger.
  const vx = clamp(-(last.x - first.x) / dt)
  const vy = clamp(-(last.y - first.y) / dt)
  return Math.hypot(vx, vy) < STOP_SPEED * 5 ? null : { vx, vy }
}

/**
 * Scroll by `move(dx, dy)` each frame until the speed dies away. Whole pixels only, carrying the
 * rest over, since a fraction of a pixel may not scroll at all. Returns a function that stops it.
 */
export function glide(v: { vx: number; vy: number }, move: (dx: number, dy: number) => void,
  schedule: (step: (t: number) => void) => number = requestAnimationFrame,
  unschedule: (id: number) => void = cancelAnimationFrame, start = performance.now()) {
  let { vx, vy } = v
  let last = start
  let carryX = 0
  let carryY = 0
  let id = 0
  const step = (t: number) => {
    const dt = Math.min(50, Math.max(0, t - last))
    last = t
    carryX += vx * dt
    carryY += vy * dt
    const dx = Math.trunc(carryX)
    const dy = Math.trunc(carryY)
    carryX -= dx
    carryY -= dy
    if (dx || dy) move(dx, dy)
    vx *= DECELERATION ** dt
    vy *= DECELERATION ** dt
    if (Math.hypot(vx, vy) >= STOP_SPEED) id = schedule(step)
  }
  id = schedule(step)
  return () => unschedule(id)
}
