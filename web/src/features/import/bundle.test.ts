import { describe, expect, it } from 'vitest'
import { normalise, parseBundle, planImport, topicNames, type ImportBundle } from './bundle'

const when = '2023-02-13T10:00:00Z'
const bundle: ImportBundle = {
  source: 'test',
  jokes: [
    { id: 'j1', setup: 'Fake premise about queues', created_at: when },
    { id: 'j2', setup: 'Another fake premise', topic: 'Travel', created_at: when },
  ],
  observations: [
    { id: 'o1', text: 'Fake thing I noticed', topic: 'travel', created_at: when },
    { id: 'o2', text: 'Second fake thing', created_at: when },
  ],
  voice_notes: [{ id: 'v1', label: 'Fake note', hashtags: [], duration_seconds: 5, created_at: when, file: 'a.webm' }],
}
const nothing = { ids: new Set<string>(), jokeSetups: new Set<string>(), observationTexts: new Set<string>() }

describe('parseBundle', () => {
  it('reads a bundle and rejects anything else', () => {
    expect(parseBundle(JSON.stringify(bundle)).jokes).toHaveLength(2)
    expect(() => parseBundle('not json')).toThrow('not valid JSON')
    expect(() => parseBundle('{"jokes": []}')).toThrow('needs jokes')
  })
})

describe('planImport', () => {
  it('imports everything into an empty JokeBox', () => {
    const plan = planImport(bundle, nothing)
    expect([plan.jokes.length, plan.observations.length, plan.voiceNotes.length, plan.skipped]).toEqual([2, 2, 1, 0])
  })

  it('skips items imported before, by id, and jokes or observations already typed in', () => {
    const plan = planImport(bundle, {
      ids: new Set(['v1', 'o2']),
      jokeSetups: new Set([normalise('  fake PREMISE about queues. ')]),
      observationTexts: new Set(),
    })
    expect(plan.jokes.map((j) => j.id)).toEqual(['j2'])
    expect(plan.observations.map((o) => o.id)).toEqual(['o1'])
    expect(plan.voiceNotes).toEqual([])
    expect(plan.skipped).toBe(3)
  })
})

describe('topicNames', () => {
  it('lists each topic once, ignoring case and blanks', () => {
    expect(topicNames([{ topic: 'Travel' }, { topic: 'travel' }, { topic: null }, { topic: ' ' }, {}])).toEqual(['Travel'])
  })
})
