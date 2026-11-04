import { describe, expect, it } from 'vitest'
import type { Joke, PerformanceLog } from '../../api/types'
import { findJokes, recordLine, showRecord } from './showJokes'

const show = (performed_at: string, jokes?: PerformanceLog['jokes']) => ({ performed_at, jokes }) as PerformanceLog

describe('finding a joke you did', () => {
  const joke = (id: string, setup: string, more: Partial<Joke> = {}) =>
    ({ id, setup, punchline: '', tag_lines: [], comments: '', hashtags: [], updated_at: '2026-10-01T00:00:00Z', ...more }) as Joke
  const jokes = [
    joke('a', 'A made-up line about a kettle', { punchline: 'it boils over' }),
    joke('b', 'Another invented fridge bit', { updated_at: '2026-10-05T00:00:00Z' }),
    joke('c', 'Fridge magnets, made up'),
    joke('d', 'Fake one about a fridge door'),
    joke('e', 'Something else', { punchline: 'the fridge again' }),
  ]

  it('finds nothing until you type', () => {
    expect(findJokes(jokes, [], '  ')).toEqual([])
  })

  it('shows at most three, setup matches first, then the latest edited', () => {
    expect(findJokes(jokes, [], 'fridge').map((j) => j.id)).toEqual(['b', 'c', 'd'])
    expect(findJokes(jokes, [], 'fridge', 10).map((j) => j.id)).toEqual(['b', 'c', 'd', 'e'])
  })

  it('matches every word anywhere in the joke, and leaves out ones already added', () => {
    expect(findJokes(jokes, [], 'kettle boils').map((j) => j.id)).toEqual(['a'])
    expect(findJokes(jokes, [{ joke_id: 'b', result: null }], 'fridge').map((j) => j.id)).toEqual(['c', 'd', 'e'])
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
