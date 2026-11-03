import { describe, expect, it } from 'vitest'
import { flingVelocity, glide } from './glide'

describe('flicking the page', () => {
  it('keeps scrolling the opposite way to the finger, at its speed', () => {
    const v = flingVelocity([{ t: 0, x: 500, y: 600 }, { t: 50, x: 400, y: 500 }], 55)
    expect(v).toEqual({ vx: 2, vy: 2 })
  })

  it('stops dead when the finger held still before lifting', () => {
    expect(flingVelocity([{ t: 0, x: 500, y: 600 }, { t: 50, x: 400, y: 600 }], 200)).toBeNull()
  })

  it("doesn't glide after a slow drag", () => {
    expect(flingVelocity([{ t: 0, x: 500, y: 600 }, { t: 80, x: 498, y: 600 }], 85)).toBeNull()
  })

  it('slows down and stops, moving in whole pixels', () => {
    const frames: ((t: number) => void)[] = []
    const moves: [number, number][] = []
    glide({ vx: 2, vy: 0 }, (dx, dy) => moves.push([dx, dy]), (step) => frames.push(step), () => {}, 0)
    for (let t = 16; frames.length && t < 10_000; t += 16) frames.shift()!(t)
    const total = moves.reduce((sum, [dx]) => sum + dx, 0)
    expect(frames).toHaveLength(0) // it stopped on its own
    expect(total).toBeGreaterThan(700) // about 2 px/ms × 500 ms, like iOS
    expect(total).toBeLessThan(1100)
    expect(moves.every(([dx]) => Number.isInteger(dx))).toBe(true)
    expect(moves[0][0]).toBeGreaterThan(moves.at(-1)![0])
  })

  it('can be stopped', () => {
    let cancelled = -1
    const stop = glide({ vx: 2, vy: 0 }, () => {}, () => 7, (id) => { cancelled = id }, 0)
    stop()
    expect(cancelled).toBe(7)
  })
})
