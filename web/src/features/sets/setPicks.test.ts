import { describe, expect, it } from 'vitest'
import type { Joke } from '../../api/types'
import { CLUSTER_ROW, inSet, inSetLast, resolvePicks } from './setPicks'

const joke = (id: string, cluster_id: string | null = null, extra: Partial<Joke> = {}) => ({ id, cluster_id, strength: null, status: 'Draft', created_at: id, updated_at: id, ...extra }) as Joke
const lead = joke('lead', 'c')
const other = joke('other', 'c', { created_at: 'z' })
const solo = joke('solo')
const jokes = [lead, other, solo]
const clusters = [{ id: 'c', title: 'A made-up cluster', notes: '', lead_joke_id: 'lead', version: 1, created_at: '', updated_at: '' }]

describe('the set joke picker', () => {
  it('adds a ticked cluster as its lead, or the version chosen for it, in tick order', () => {
    expect(resolvePicks([solo.id, CLUSTER_ROW + 'c'], new Map(), jokes, clusters).map((j) => j.id)).toEqual(['solo', 'lead'])
    expect(resolvePicks([CLUSTER_ROW + 'c', solo.id], new Map([['c', 'other']]), jokes, clusters).map((j) => j.id)).toEqual(['other', 'solo'])
  })

  it('falls back to the lead when the chosen version left the cluster, and skips jokes gone', () => {
    const moved = { ...other, cluster_id: null }
    expect(resolvePicks([CLUSTER_ROW + 'c', 'gone'], new Map([['c', 'other']]), [lead, moved], clusters).map((j) => j.id)).toEqual(['lead'])
  })

  it('counts a cluster in the set when any version is, and puts those rows last in order', () => {
    expect(inSet(lead, new Set(['other']), jokes)).toBe(true)
    expect(inSet(solo, new Set(['other']), jokes)).toBe(false)
    expect(inSetLast(['a', 'B', 'c', 'D'], (r) => r === r.toUpperCase())).toEqual(['a', 'c', 'B', 'D'])
  })
})
