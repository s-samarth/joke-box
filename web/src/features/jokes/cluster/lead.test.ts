import { describe, expect, it } from 'vitest'
import type { Joke } from '../../../api/types'
import { allDiscarded, clusterName, inOrder, leadOf } from './lead'

const joke = (id: string, more: Partial<Joke> = {}): Joke =>
  ({ id, setup: `Fake ${id}`, status: 'Testing', strength: null, cluster_id: 'c', created_at: `2026-01-0${id.length}`, updated_at: '2026-01-01', ...more }) as Joke

describe('the lead', () => {
  it('is the stored one while it is not discarded', () => {
    expect(leadOf({ lead_joke_id: 'b' }, [joke('a'), joke('b')])?.id).toBe('b')
  })

  it('hands on to the strongest, then the most recently edited', () => {
    const versions = [joke('a', { status: 'Discarded' }), joke('b', { strength: 2 }), joke('c', { strength: 4 })]
    expect(leadOf({ lead_joke_id: 'a' }, versions)?.id).toBe('c')
    const tie = [joke('a', { updated_at: '2026-02-01' }), joke('b', { updated_at: '2026-03-01' })]
    expect(leadOf({ lead_joke_id: 'gone' }, tie)?.id).toBe('b')
    // Edited at the same moment (a bulk move): the newest, then the highest id, as on the server
    const same = { updated_at: '2026-02-01' }
    expect(leadOf({ lead_joke_id: 'gone' }, [joke('x', { ...same, created_at: '2026-01-02' }), joke('y', { ...same, created_at: '2026-01-01' })])?.id).toBe('x')
    expect(leadOf({ lead_joke_id: 'gone' }, [joke('m', same), joke('n', same)])?.id).toBe('n')
  })

  it('is the only active version by default', () => {
    expect(leadOf({ lead_joke_id: null }, [joke('a', { status: 'discarded' }), joke('b')])?.id).toBe('b')
  })

  it('stays put when every version is discarded', () => {
    const versions = [joke('a', { status: 'Discarded' }), joke('b', { status: 'Discarded', strength: 5 })]
    expect(leadOf({ lead_joke_id: 'a' }, versions)?.id).toBe('a')
    expect(allDiscarded(versions)).toBe(true)
  })

  it('comes first, then the newest', () => {
    const versions = [joke('a'), joke('bbb'), joke('cc')]
    expect(inOrder({ lead_joke_id: 'cc' }, versions).map((j) => j.id)).toEqual(['cc', 'bbb', 'a'])
  })

  it("names an untitled cluster by its lead's setup", () => {
    expect(clusterName({ title: '  ', lead_joke_id: 'a' }, [joke('a')])).toBe('Fake a')
    expect(clusterName({ title: 'Fake core', lead_joke_id: 'a' }, [joke('a')])).toBe('Fake core')
  })
})
