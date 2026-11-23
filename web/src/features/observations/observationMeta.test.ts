import { describe, expect, it } from 'vitest'
import type { Observation, Topic } from '../../api/types'
import { kindLabel, matchesFilters, observationSort, PLAIN, PLAIN_KIND, sortObservations, topicLabel } from './observationMeta'

const obs = (topic_id: string | null, kind_id: string | null) =>
  ({ id: 'o', text: 'Fake thing noticed', topic_id, kind_id, version: 1, created_at: '', updated_at: '' }) as Observation

describe('observation filters', () => {
  it('lets everything through with no filter', () => {
    expect(matchesFilters(obs(null, null), null, null)).toBe(true)
  })
  it('finds the ones under a topic, and the plain ones', () => {
    expect(matchesFilters(obs('t', 'k'), 't', null)).toBe(true)
    expect(matchesFilters(obs('u', null), 't', null)).toBe(false)
    expect(matchesFilters(obs('t', null), null, PLAIN_KIND)).toBe(true)
    expect(matchesFilters(obs('t', 'k'), null, PLAIN_KIND)).toBe(false)
  })
  it('needs both the topic and the kind when both are picked', () => {
    expect(matchesFilters(obs('t', 'k'), 't', 'k')).toBe(true)
    expect(matchesFilters(obs('t', null), 't', 'k')).toBe(false)
  })
})

describe('observation labels', () => {
  it('calls a note with no kind a plain observation', () => {
    expect(kindLabel([{ id: 'k', name: 'Set ideas' }], null)).toBe(PLAIN)
    expect(kindLabel([{ id: 'k', name: 'Set ideas' }], 'k')).toBe('Set ideas')
    expect(kindLabel([], 'gone')).toBe(PLAIN)
  })
  it('names a topic, or nothing when there is none', () => {
    const topics = [{ id: 't', name: 'Buses', is_system: false, subtopics: [] }] as unknown as Topic[]
    expect(topicLabel(topics, 't')).toBe('Buses')
    expect(topicLabel(topics, null)).toBeNull()
  })
})

describe('observation sorts', () => {
  const rated = (id: string, strength: number | null, created_at: string) => ({ id, strength, created_at }) as Observation
  const list = [rated('a', null, '2026-01-03'), rated('b', 2, '2026-01-01'), rated('c', 5, '2026-01-02')]
  const ids = (sort: Parameters<typeof sortObservations>[1]) => sortObservations(list, sort).map((o) => o.id)

  it('puts the newest first unless told otherwise', () => {
    expect(observationSort(null)).toBe('new')
    expect(observationSort('nonsense')).toBe('new')
    expect(ids('new')).toEqual(['a', 'c', 'b'])
    expect(ids('old')).toEqual(['b', 'c', 'a'])
  })
  it('sorts by strength with unrated ones last either way', () => {
    expect(ids('strong')).toEqual(['c', 'b', 'a'])
    expect(ids('weak')).toEqual(['b', 'c', 'a'])
  })
})
