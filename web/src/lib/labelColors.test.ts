import { describe, expect, it } from 'vitest'
import { LABEL_PALETTE, NOT_SURE_COLOR, PLAIN_COLOR, nextLabelColor, optionColor } from './labelColors'

describe('label colours', () => {
  it('uses the stored colour, then the default by id, then plain; no option is Not sure', () => {
    expect(optionColor({ id: 'i-win', label: 'I win', color: '#cbd5e1' })).toBe('#cbd5e1')
    expect(optionColor({ id: 'i-lose', label: 'I lose' })).toBe('#ff5a47')
    expect(optionColor({ id: 'x1', label: 'Mine own' })).toBe(PLAIN_COLOR)
    expect(optionColor(null)).toBe(NOT_SURE_COLOR)
  })
  it('gives a new option a swatch its field is not using', () => {
    const used = [{ id: 'a', label: 'A', color: LABEL_PALETTE[0].color }, { id: 'mixed', label: 'Mixed' }]
    expect(nextLabelColor(used)).toBe(LABEL_PALETTE[2].color)
  })
})
