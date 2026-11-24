import { describe, expect, it } from 'vitest'
import type { Joke } from '../../../api/types'
import { badge, stackRows } from './stacks'

const joke = (id: string, cluster: string | null, more: Partial<Joke> = {}): Joke =>
  ({ id, setup: `Fake ${id}`, status: 'Testing', strength: null, cluster_id: cluster, created_at: '2026-01-01', updated_at: '2026-01-01', ...more }) as Joke

const clusters = [{ id: 'c', title: '', notes: '', lead_joke_id: 'b', version: 1, created_at: '', updated_at: '' }]
const opts = { clusters, showDiscarded: false }

describe('stacked rows', () => {
  const a = joke('a', 'c')
  const b = joke('b', 'c')
  const solo = joke('solo', null)
  const gone = joke('d', 'c', { status: 'Discarded' })
  const all = [a, solo, b, gone]

  it('shows a cluster once, as its lead, where the lead sorts', () => {
    const rows = stackRows([a, solo, b], all, opts)
    expect(rows.map((r) => r.joke.id)).toEqual(['solo', 'b'])
    expect(badge(rows[1])).toBe('2 versions')
  })

  it('shows the matching version when the lead is filtered out', () => {
    const [row] = stackRows([a], all, opts)
    expect(row.joke.id).toBe('a')
    expect(badge(row)).toBe('1 of 2 versions')
  })

  it('counts discarded versions only while they are shown', () => {
    const [row] = stackRows([a, b, gone], all, { ...opts, showDiscarded: true })
    expect(badge(row)).toBe('3 versions')
  })

  it('hides away entirely when every version is discarded and hidden', () => {
    const dead = [joke('x', 'z', { status: 'Discarded' })]
    expect(stackRows([], dead, opts)).toEqual([])
    const [row] = stackRows(dead, dead, { ...opts, showDiscarded: true })
    expect(row.discarded).toBe(true)
  })

  it('uses the lead setup when the cluster is unnamed, even when only an alternate matches', () => {
    const [row] = stackRows([a], all, opts)
    expect(row.cluster).toEqual({ id: 'c', name: b.setup, lead: b })
  })
})
