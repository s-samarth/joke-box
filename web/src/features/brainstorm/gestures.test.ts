import { describe, expect, it } from 'vitest'
import { framePanner, snapZoom, twoFingers } from './gestures'

describe('two fingers on the page', () => {
  const start: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 400, y: 600 }, { x: 500, y: 600 }]

  it('scroll when they move together, even drifting apart a little', () => {
    expect(twoFingers(start, [{ x: 397, y: 580 }, { x: 503, y: 580 }])).toBe('scroll')
  })

  it('pinch when the gap clearly changes', () => {
    expect(twoFingers(start, [{ x: 380, y: 600 }, { x: 520, y: 600 }])).toBe('pinch')
  })

  it("wait while it isn't clear yet", () => {
    expect(twoFingers(start, [{ x: 398, y: 595 }, { x: 502, y: 595 }])).toBeNull()
  })

  it('a pinch ending near fit snaps to fit', () => {
    expect(snapZoom(1.04)).toBe(1)
    expect(snapZoom(0.95)).toBe(1)
    expect(snapZoom(1.3)).toBe(1.3)
  })
})

describe('dragging the page', () => {
  const setup = () => {
    const frames: (() => void)[] = []
    const moved: [number, number][] = []
    const panner = framePanner((dx, dy) => moved.push([dx, dy]), (run) => frames.push(run))
    const frame = () => frames.splice(0).forEach((run) => run())
    return { panner, moved, frame, frames }
  }

  it("keeps a slow drag's fractions of a pixel instead of losing them", () => {
    const { panner, moved, frame } = setup()
    for (let i = 0; i < 30; i++) {
      panner.add(0, 0.34) // a slow drag: a third of a pixel per touch event
      frame()
    }
    const total = moved.reduce((sum, [, dy]) => sum + dy, 0)
    expect(total).toBe(10) // 30 × 0.34 = 10.2: all but the last fraction
    expect(moved.every(([, dy]) => dy === 1)).toBe(true) // one pixel at a time, never a jump
  })

  it('scrolls once a frame, however many touch events arrive in it', () => {
    const { panner, moved, frame, frames } = setup()
    panner.add(0, 3)
    panner.add(0, 4)
    expect(frames).toHaveLength(1)
    frame()
    expect(moved).toEqual([[0, 7]])
  })

  it('a fresh drag starts without the last one’s leftover', () => {
    const { panner, moved, frame } = setup()
    panner.add(0.9, 0)
    frame()
    panner.reset()
    panner.add(0.5, 0)
    frame()
    expect(moved).toEqual([])
  })
})
