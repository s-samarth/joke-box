import { describe, expect, it } from 'vitest'
import type { Bit, Setlist } from '../../api/types'
import { setTopics, swapTopics } from './setPick'

const bit = (id: string, topic_id: string | null) => ({ id, topic_id }) as Bit
const set = (id: string, items: [string, number][]) =>
  ({ id, items: items.map(([bit_id, duration_seconds], position) => ({ bit_id, position, duration_seconds })) }) as Setlist

const bits = [bit('b1', 'travel'), bit('b2', 'work'), bit('b3', 'travel'), bit('b4', null)]
const a = set('a', [['b1', 60], ['b2', 90]])
const b = set('b', [['b3', 120], ['b4', 30]])

describe('picking sets for a show', () => {
  it('lists the topics across several sets once each, skipping bits with none', () => {
    expect(setTopics([a, b], bits)).toEqual(['travel', 'work'])
    expect(setTopics([], bits)).toEqual([])
  })

  it('swaps set topics without losing topics picked by hand', () => {
    expect(swapTopics(['crowd'], [], ['travel', 'work'])).toEqual(['crowd', 'travel', 'work'])
    expect(swapTopics(['crowd', 'travel', 'work'], ['travel', 'work'], ['travel'])).toEqual(['crowd', 'travel'])
  })
})
