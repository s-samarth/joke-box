import { describe, expect, it } from 'vitest'
import { inOrder } from './ordering'

const items = ['a', 'b', 'c'].map((id) => ({ id }))

describe('inOrder', () => {
  it('follows the ids', () => {
    expect(inOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })
  it('keeps items the ids leave out at the end, and skips unknown ids', () => {
    expect(inOrder(items, ['x', 'b']).map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })
})
