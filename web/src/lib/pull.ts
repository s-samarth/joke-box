/**
 * The rules of pull to refresh, kept apart from the touch handling so they can be tested.
 * A pull starts only at the very top of the page, on a part of the screen with no use of its own
 * for a downward drag: not while typing, drawing, in a dialog or menu, or inside a box that has
 * scrolled (dragging down there scrolls the box back up).
 */

/** How far the indicator must travel before letting go refreshes. */
export const PULL_TRIGGER = 72
/** The indicator stops here however far the finger goes. */
export const PULL_MAX = 110

/** A trackpad needs a longer swipe than a finger: a flick that ends at the top mustn't refresh. */
export const WHEEL_DRAG = 4

/** A wheel event's movement in pixels: Firefox reports a mouse wheel in lines. */
export function wheelPixels(deltaY: number, deltaMode: number): number {
  return deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 800 : deltaY
}

/** Finger travel to indicator travel: halved, so it lags the finger as iOS does, and capped. */
export function pullDistance(dy: number): number {
  return dy <= 0 ? 0 : Math.min(PULL_MAX, dy / 2)
}

const OWN_DRAG = 'input, textarea, select, canvas, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], [data-no-pull]'

/** The part of an element a pull needs: real DOM elements fit, and so do simple fakes in tests. */
export interface PullTarget {
  closest(selector: string): unknown
  scrollTop: number
  parentElement: PullTarget | null
}

export function canPullFrom(target: PullTarget | null, scrollY: number): boolean {
  if (!target || scrollY > 0 || target.closest(OWN_DRAG)) return false
  for (let el: PullTarget | null = target; el; el = el.parentElement) if (el.scrollTop > 0) return false
  return true
}
