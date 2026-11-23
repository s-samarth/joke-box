import { describe, expect, it } from 'vitest'
import type { Premise, PremiseStatus } from '../../api/premises'
import { keepDiscarded } from '../jokes/discarded'
import { premiseSort, sortPremises, type PremiseSort } from './premiseSort'

const premise = (id: string, topic_id: string, strength: number | null, created_at: string, status: PremiseStatus = 'Draft') =>
  ({ id, take: 'A made-up take', notes: '', topic_id, strength, status, version: 1, created_at, updated_at: created_at }) as Premise

const list = [premise('a', 't2', null, '2026-01-03'), premise('b', 't1', 2, '2026-01-01'), premise('c', 't1', 5, '2026-01-02')]
const jokes: Record<string, number> = { a: 1, b: 4, c: 0 }
const ids = (sort: PremiseSort) => sortPremises(list, sort, (p) => jokes[p.id], ['t1', 't2']).map((p) => p.id)

describe('premise sorts', () => {
  it('puts the newest first unless told otherwise', () => {
    expect(premiseSort(null)).toBe('new')
    expect(premiseSort('nonsense')).toBe('new')
    expect(ids('new')).toEqual(['a', 'c', 'b'])
    expect(ids('old')).toEqual(['b', 'c', 'a'])
  })
  it('keeps your topics in order, newest first in each', () => {
    expect(ids('topic')).toEqual(['c', 'b', 'a'])
  })
  it('sorts by strength with unrated ones last, and by jokes on it', () => {
    expect(ids('strong')).toEqual(['c', 'b', 'a'])
    expect(ids('weak')).toEqual(['b', 'c', 'a'])
    expect(ids('most')).toEqual(['b', 'a', 'c'])
    expect(ids('fewest')).toEqual(['c', 'a', 'b'])
  })
})

describe('discarded premises', () => {
  const mixed = [premise('a', 't1', null, '2026-01-01'), premise('b', 't1', null, '2026-01-02', 'Discarded')]
  it('stay hidden until shown, and say how many', () => {
    expect(keepDiscarded(mixed, false, false)).toEqual({ kept: [mixed[0]], discarded: 1 })
    expect(keepDiscarded(mixed, true, false).kept).toHaveLength(2)
  })
  it('show when a status is picked, since that says which you want', () => {
    expect(keepDiscarded(mixed, false, true)).toEqual({ kept: mixed, discarded: 0 })
  })
})
