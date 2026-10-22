import { describe, expect, it } from 'vitest'
import { DEFAULT_TYPE_COLORS, SWATCHES, nextFreeColor, onColor } from './typeColors'

describe('type colours', () => {
  it('gives a new type the first colour nobody has', () => {
    expect(nextFreeColor([])).toBe('#fde047')
    expect(nextFreeColor(['#FDE047'])).toBe('#5eead4')
  })

  it('offers every default and auto colour in the grid', () => {
    const grid = new Set(SWATCHES.map((s) => s.color))
    for (const c of Object.values(DEFAULT_TYPE_COLORS)) expect(grid.has(c)).toBe(true)
    expect(new Set(SWATCHES.map((s) => s.color)).size).toBe(SWATCHES.length)
  })

  it('puts dark ink on light colours and paper on dark ones', () => {
    expect(onColor('#fde047')).toBe('#151923')
    expect(onColor('#9f1239')).toBe('#ece6da')
  })
})
