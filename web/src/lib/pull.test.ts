/** Pull to refresh starts only where a downward drag has no other job. */
import { describe, expect, it } from 'vitest'
import { canPullFrom, PULL_MAX, PULL_TRIGGER, pullDistance, type PullTarget, wheelPixels } from './pull'

/** A made-up element: `own` is what `closest` finds (a textarea, a dialog...), if anything. */
function el(scrollTop = 0, parentElement: PullTarget | null = null, own = false): PullTarget {
  return { scrollTop, parentElement, closest: () => (own ? {} : null) }
}

describe('how far the indicator moves', () => {
  it('lags the finger, ignores upward drags and stops at a maximum', () => {
    expect(pullDistance(-30)).toBe(0)
    expect(pullDistance(100)).toBe(50)
    expect(pullDistance(PULL_TRIGGER * 2)).toBe(PULL_TRIGGER)
    expect(pullDistance(1000)).toBe(PULL_MAX)
  })
})

describe('where a pull may start', () => {
  it('starts at the top of the page, on an ordinary part of the screen', () => {
    expect(canPullFrom(el(0, el(0, el(0))), 0)).toBe(true)
  })

  it("doesn't start once the page has scrolled down", () => {
    expect(canPullFrom(el(), 120)).toBe(false)
  })

  it("doesn't start while typing, drawing, or in a dialog or menu", () => {
    expect(canPullFrom(el(0, null, true), 0)).toBe(false)
  })

  it("doesn't start inside a box that has scrolled: dragging down scrolls the box back", () => {
    expect(canPullFrom(el(0, el(40, el(0))), 0)).toBe(false)
  })

  it("doesn't start on a slider, like the Jokes month scrubber on iPad", () => {
    const thumb: PullTarget = { scrollTop: 0, parentElement: null, closest: (selector) => (selector.includes('[role="slider"]') ? {} : null) }
    expect(canPullFrom(thumb, 0)).toBe(false)
  })

  it("doesn't start without a target", () => {
    expect(canPullFrom(null, 0)).toBe(false)
  })
})

describe('a trackpad or mouse wheel, in pixels', () => {
  it('keeps pixels, and turns lines (Firefox) and pages into pixels', () => {
    expect(wheelPixels(-40, 0)).toBe(-40)
    expect(wheelPixels(-3, 1)).toBe(-48)
    expect(wheelPixels(-1, 2)).toBe(-800)
  })
})
