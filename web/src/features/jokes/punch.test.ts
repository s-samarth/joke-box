import { describe, expect, it } from 'vitest'
import { swapPunch } from './punch'

describe('swapPunch', () => {
  it('trades the alternate with the punchline, in the same row', () => {
    expect(swapPunch('Made-up first', ['a', 'Made-up second', 'c'], 1)).toEqual({ punchline: 'Made-up second', alt_punchlines: ['a', 'Made-up first', 'c'] })
  })

  it('swaps back when used again', () => {
    const once = swapPunch('Made-up first', ['Made-up second'], 0)
    expect(swapPunch(once.punchline, once.alt_punchlines, 0)).toEqual({ punchline: 'Made-up first', alt_punchlines: ['Made-up second'] })
  })

  it('just moves the alternate up when there is no punchline yet', () => {
    expect(swapPunch('  ', ['Made-up only', 'b'], 0)).toEqual({ punchline: 'Made-up only', alt_punchlines: ['b'] })
  })
})
