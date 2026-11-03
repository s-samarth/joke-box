/**
 * Fingers on the handwriting page: telling a two-finger scroll from a pinch, and moving the page
 * smoothly while a finger drags it.
 */
export type Spot = { x: number; y: number }

export const middle = (a: Spot, b: Spot) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
export const apart = (a: Spot, b: Spot) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))

/** How far (px) the fingers' midpoint travels before two fingers count as a scroll. */
const SCROLL_AFTER = 12
/** How much (px) the gap between the fingers changes before they count as a pinch. */
const PINCH_AFTER = 24

/**
 * Two fingers just landed at `start`; are they scrolling, pinching, or not clear yet? Fingers
 * scrolling together always drift apart a little, so only a clear change in the gap zooms;
 * whichever happens first decides, until the fingers lift.
 */
export function twoFingers(start: [Spot, Spot], now: [Spot, Spot]): 'scroll' | 'pinch' | null {
  if (Math.abs(apart(...now) - apart(...start)) > PINCH_AFTER) return 'pinch'
  const from = middle(...start)
  const to = middle(...now)
  return Math.hypot(to.x - from.x, to.y - from.y) > SCROLL_AFTER ? 'scroll' : null
}

/** A pinch that ends this close to fitting the screen snaps to it: no accidental 103%. */
export const snapZoom = (zoom: number) => (Math.abs(zoom - 1) < 0.08 ? 1 : zoom)

/**
 * Scrolling that follows a dragging finger. Movements add up and the page scrolls once a
 * frame, by whole pixels, carrying the rest over.
 *
 * Why: Safari scrolls only by whole pixels, so a slow drag's steps of a third of a pixel were
 * lost and the page stuck, then jumped. And scrolling on every touch event rather than every
 * frame moved the page unevenly (two steps in one frame, none in the next).
 */
export function framePanner(apply: (dx: number, dy: number) => void,
  schedule: (run: () => void) => unknown = requestAnimationFrame) {
  let x = 0
  let y = 0
  let queued = false
  const flush = () => {
    queued = false
    const dx = Math.trunc(x)
    const dy = Math.trunc(y)
    x -= dx
    y -= dy
    if (dx || dy) apply(dx, dy)
  }
  return {
    add(dx: number, dy: number) {
      x += dx
      y += dy
      if (!queued) {
        queued = true
        schedule(flush)
      }
    },
    /** Forget any fraction left over, for a fresh drag. */
    reset() { x = 0; y = 0 },
  }
}
