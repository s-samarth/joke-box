import { describe, expect, it } from 'vitest'
import type { PerformanceLog, Setlist } from '../../api/types'
import { recordLine, setJokes, showRecord, swapJokes } from './showJokes'

const set = (...ids: string[]) => ({ items: ids.map((joke_id, position) => ({ joke_id, position })) }) as unknown as Setlist
const show = (performed_at: string, jokes?: PerformanceLog['jokes']) => ({ performed_at, jokes }) as PerformanceLog

describe('the jokes done at a show', () => {
  it('come from the ticked sets in running order, each once', () => {
    expect(setJokes([set('a', 'b'), set('b', 'c')])).toEqual(['a', 'b', 'c'])
  })

  it('swap with the sets, keeping rated jokes and ones still in a ticked set', () => {
    const current = [{ joke_id: 'a', result: null }, { joke_id: 'b', result: 'killed' as const }, { joke_id: 'x', result: null }]
    const swapped = swapJokes(current, ['a', 'b'], ['c'])
    expect(swapped).toEqual([{ joke_id: 'b', result: 'killed' }, { joke_id: 'x', result: null }, { joke_id: 'c', result: null }])
    expect(swapJokes([{ joke_id: 'a', result: null }], ['a'], ['a', 'd']).map((j) => j.joke_id)).toEqual(['a', 'd'])
  })
})

describe("a joke's record", () => {
  it('counts the shows it was done at and how each went', () => {
    const logs = [
      show('2026-10-01T15:00:00Z', [{ joke_id: 'a', result: 'killed' }]),
      show('2026-09-01T15:00:00Z', [{ joke_id: 'a', result: 'bombed' }, { joke_id: 'b', result: null }]),
      show('2026-08-01T15:00:00Z'), // cached before shows had jokes
    ]
    const record = showRecord(logs, 'a')
    expect(record).toEqual({ shows: 2, killed: 1, ok: 0, bombed: 1, last: '2026-10-01T15:00:00Z' })
    expect(recordLine(record)).toBe('Done at 2 shows: 1 killed, 1 bombed')
    expect(recordLine(showRecord(logs, 'b'))).toBe('Done at 1 show')
    expect(showRecord(logs, 'z').shows).toBe(0)
  })
})
