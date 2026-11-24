import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Joke } from '../../api/types'
import { formatDateTime } from '../../lib/time'
import { stackRows } from './cluster/stacks'
import { JokeList } from './JokeList'
import { matchesFilters } from './useJokeFilters'

const joke = (id: string, cluster_id: string | null): Joke => ({
  id, cluster_id, setup: `Setup ${id}`, punchline: `Punch ${id}`, types: [], hashtags: [], tag_lines: [],
  version: 1, topic_id: 'topic', subtopic_id: null, premise_id: null, strength: null, duration_seconds: 0,
  clean_rating: null, language: null, follows_id: null, comments: '', status: 'Draft', created_at: '2026-11-23T18:45:00Z', updated_at: '2026-11-24T18:45:00Z',
})
const lead = joke('lead', 'c')
const alternate = joke('alternate', 'c')
const solo = joke('solo', null)
const cluster = { id: 'c', title: 'Demo cluster', notes: '', lead_joke_id: lead.id, version: 1, created_at: '', updated_at: '' }
const jokes = [alternate, solo, lead]
const rows = stackRows(jokes, jokes, { clusters: [cluster], showDiscarded: false })

describe('Jokes list display', () => {
  it.each([true, false])('keeps one cluster link and the standalone joke with names=%s', (showClusterNames) => {
    const html = renderToStaticMarkup(<MemoryRouter><JokeList rows={rows} topics={[]} sort="new" showClusterNames={showClusterNames} query="" /></MemoryRouter>)
    expect(html.match(/<li\b/g)).toHaveLength(2)
    expect(html).toContain('href="/jokes/c/c"')
    expect(html).toContain('href="/jokes/solo"')
    expect(html).toContain(solo.setup)
    expect(html).toContain(solo.punchline)
    expect(html).toContain('2 versions')
    expect(html).not.toContain(alternate.setup)
    expect(html.includes(cluster.title)).toBe(showClusterNames)
    expect(html.includes(lead.setup)).toBe(!showClusterNames)
    expect(html.includes(lead.punchline)).toBe(!showClusterNames)
    if (showClusterNames) expect(html).toContain(formatDateTime(lead.created_at))
  })

  it('finds a cluster by name while respecting the other filters', () => {
    const filters = { topic: null, sub: null, type: null, premise: null, q: 'DEMO', status: 'Draft' }
    expect(matchesFilters(lead, filters, cluster.title)).toBe(true)
    expect(matchesFilters(solo, filters)).toBe(false)
    expect(matchesFilters(lead, { ...filters, status: 'Discarded' }, cluster.title)).toBe(false)
  })
})
