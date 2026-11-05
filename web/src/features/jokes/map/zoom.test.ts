import { describe, expect, it } from 'vitest'
import { fitZoom } from './zoom'

describe('fitZoom', () => {
  it('shrinks a wide drawing to the room, less the padding', () => {
    expect(fitZoom(632, 1200)).toBe(0.5)
  })

  it('never zooms past 100%', () => {
    expect(fitZoom(2000, 600)).toBe(1)
  })

  it('stops at the smallest zoom step', () => {
    expect(fitZoom(300, 5000)).toBe(0.3)
  })
})
