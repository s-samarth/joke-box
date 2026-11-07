/** Search everything: every kind is found by its words, and each hit opens the right screen. Made-up material. */
import { describe, expect, it } from 'vitest'
import { firstIdea } from '../brainstorm/sessionMeta'
import { snippet } from '../../lib/search'
import { type Lists, searchAll } from './searchIndex'

const when = '2026-10-01T10:00:00Z'
const stamp = { created_at: when, updated_at: when }

const lists = {
  jokes: [{ id: 'j1', setup: 'Fake setup about a parrot', punchline: 'Fake punchline', comments: '', tag_lines: ['Fake tag'], hashtags: ['#birds'], ...stamp }],
  premises: [{ id: 'p1', take: 'Fake take on parrots', notes: 'Fake reason', topic_id: 't', ...stamp }],
  observations: [{ id: 'o1', text: 'Fake parrot on the metro', topic_id: null, ...stamp }],
  sessions: [{ id: 's1', title: 'Fake parrot session', content: 'Fake typed words', ink_strokes: 0, joke_ids: [], observation_ids: [], ...stamp }],
  rewrites: [{ id: 'r1', joke_id: 'j1', title: 'Fake parrot rewrite', content: '', ...stamp }],
  voice: [{ id: 'v1', label: 'Fake parrot voice', hashtags: ['birds'], ...stamp }],
  sets: [{ id: 'set1', name: 'Fake parrot set', venue_name: null, ...stamp }],
  shows: [{ id: 'sh1', venue_name: 'Fake Club', notes: 'Fake parrot bit landed', performed_at: when, ...stamp }],
  craft: [{ id: 'c1', title: 'Fake parrot craft', body: '', source: '', hashtags: [], ...stamp }],
  analyses: [{ id: 'a1', title: 'Fake parrot analysis', body: '', ...stamp }],
  watchlist: [{ id: 'w1', title: 'Fake parrot routine', comedian: 'Fake Comic', category: '', description: '', ...stamp }],
} as unknown as Lists

describe('search everything', () => {
  it('finds every kind, in a fixed order, each opening its own screen', () => {
    const groups = searchAll(lists, 'parrot')
    expect(groups.map((g) => g.kind)).toEqual(['Jokes', 'Premises', 'Observations', 'Brainstorms', 'Rewrites', 'Voice notes', 'Sets', 'Shows', 'Craft', 'Analyses', 'Watchlist'])
    const to = Object.fromEntries(groups.map((g) => [g.kind, g.hits[0].to]))
    expect(to).toMatchObject({ Jokes: '/jokes/j1', Rewrites: '/jokes/j1/rewrite', Brainstorms: '/brainstorm/s1', Observations: '/observations/o1', 'Voice notes': '/voice?q=parrot' })
  })

  it('needs every word, in any order and case', () => {
    expect(searchAll(lists, 'METRO parrot').map((g) => g.kind)).toEqual(['Observations'])
    expect(searchAll(lists, 'parrot penguin')).toEqual([])
    expect(searchAll(lists, '   ')).toEqual([])
  })

  it('finds hashtags with or without the #', () => {
    expect(searchAll(lists, '#birds').map((g) => g.kind)).toEqual(['Jokes', 'Voice notes'])
    expect(searchAll(lists, 'birds').map((g) => g.kind)).toEqual(['Jokes', 'Voice notes'])
  })
})

describe('a hit line', () => {
  it('shows the part around the match in long text', () => {
    const long = `${'Fake filler words '.repeat(20)}the parrot moment ${'and more filler '.repeat(20)}`
    const piece = snippet(long, ['parrot'])
    expect(piece).toContain('parrot')
    expect(piece.startsWith('…') && piece.endsWith('…')).toBe(true)
  })
})

describe('turning a brainstorm into a joke', () => {
  it('starts from the first typed paragraph', () => {
    expect(firstIdea('\n\nFake first idea\nstill it\n\nFake second idea')).toBe('Fake first idea\nstill it')
    expect(firstIdea('')).toBe('')
    expect(firstIdea('x'.repeat(500)).length).toBe(401)
  })
})
