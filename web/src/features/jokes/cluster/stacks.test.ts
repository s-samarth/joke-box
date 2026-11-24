import { describe, expect, it } from 'vitest'
import type { Joke } from '../../../api/types'
import { badge, stackRows } from './stacks'

const joke = (id: string, cluster: string | null, more: Partial<Joke> = {}): Joke =>
  ({ id, setup: `Fake ${id}`, status: 'Testing', strength: null, cluster_id: cluster, created_at: '2026-01-01', updated_at: '2026-01-01', ...more }) as Joke

const clusters = [{ id: 'c', title: '', notes: '', lead_joke_id: 'b', version: 1, created_at: '', updated_at: '' }]
const opts = { clusters, showDiscarded: false, flat: false }

describe('stacked rows', () => {
  const a = joke('a', 'c')
  const b = joke('b', 'c')
  const solo = joke('solo', null)
  const gone = joke('d', 'c', { status: 'Discarded' })
  const all = [a, solo, b, gone]

  it('shows a cluster once, as its lead, where the lead sorts', () => {
    const rows = stackRows([a, solo, b], all, opts)
    expect(rows.map((r) => r.joke.id)).toEqual(['solo', 'b'])
    expect(badge(rows[1], false)).toBe('2 versions')
  })

  it('shows the matching version when the lead is filtered out', () => {
    const [row] = stackRows([a], all, opts)
    expect(row.joke.id).toBe('a')
    expect(badge(row, false)).toBe('1 of 2 versions')
  })

  it('counts discarded versions only while they are shown', () => {
    const [row] = stackRows([a, b, gone], all, { ...opts, showDiscarded: true })
    expect(badge(row, false)).toBe('3 versions')
  })

  it('hides away entirely when every version is discarded and hidden', () => {
    const dead = [joke('x', 'z', { status: 'Discarded' })]
    expect(stackRows([], dead, opts)).toEqual([])
    const [row] = stackRows(dead, dead, { ...opts, showDiscarded: true })
    expect(row.discarded).toBe(true)
  })

  it('lists every version when flat', () => {
    const rows = stackRows([a, b], all, { ...opts, flat: true })
    expect(rows.map((r) => badge(r, true))).toEqual(['1 of 2 versions', 'Lead of 2'])
  })
})
