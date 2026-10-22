import { describe, expect, it } from 'vitest'
import type { Joke, Setlist } from '../../api/types'
import { setTopics, swapTopics } from './setPick'

const joke = (id: string, topic_id: string | null) => ({ id, topic_id }) as Joke
const set = (id: string, items: [string, number][]) =>
  ({ id, items: items.map(([joke_id, duration_seconds], position) => ({ joke_id, position, duration_seconds })) }) as Setlist

const jokes = [joke('b1', 'travel'), joke('b2', 'work'), joke('b3', 'travel'), joke('b4', null)]
const a = set('a', [['b1', 60], ['b2', 90]])
const b = set('b', [['b3', 120], ['b4', 30]])

describe('picking sets for a show', () => {
  it('lists the topics across several sets once each, skipping jokes with none', () => {
    expect(setTopics([a, b], jokes)).toEqual(['travel', 'work'])
    expect(setTopics([], jokes)).toEqual([])
  })

  it('swaps set topics without losing topics picked by hand', () => {
    expect(swapTopics(['crowd'], [], ['travel', 'work'])).toEqual(['crowd', 'travel', 'work'])
    expect(swapTopics(['crowd', 'travel', 'work'], ['travel', 'work'], ['travel'])).toEqual(['crowd', 'travel'])
  })
})
