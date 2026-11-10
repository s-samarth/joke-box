// Made-up material only.
import { describe, expect, it } from 'vitest'
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { daysAgo, pulse, type PulseInput } from './pulse'
import { partOfDay } from './pulseNotes'

const TODAY = '2026-11-11'
/** Noon in India, `ago` days before TODAY. */
const at = (ago: number, hour = 12) => new Date(Date.UTC(2026, 10, 11 - ago, hour - 5, -30)).toISOString()

let n = 0
const joke = (ago: number, extra: Partial<Joke> = {}): Joke =>
  ({ id: `j${++n}`, setup: 'A made-up setup', punchline: 'A made-up punch', status: 'Draft', premise_id: null, created_at: at(ago), updated_at: at(ago), ...extra }) as Joke
const premise = (ago: number, id = `p${++n}`): Premise => ({ id, take: 'A made-up take', notes: '', topic_id: 't1', version: 1, created_at: at(ago), updated_at: at(ago) })
const obs = (ago: number, extra: Partial<Observation> = {}): Observation =>
  ({ id: `o${++n}`, text: 'Made-up thing noticed', topic_id: 't1', kind_id: null, premise_ids: [], joke_ids: [], version: 1, created_at: at(ago), updated_at: at(ago), ...extra }) as Observation

const input = (lists: Partial<PulseInput>): PulseInput => ({
  jokes: [], premises: [], observations: [], today: TODAY,
  used: (o) => o.joke_ids.length + o.premise_ids.length > 0,
  topicName: (id) => (id === 't1' ? 'Trains' : 'Random'),
  ...lists,
})

describe('writing pulse', () => {
  it('counts days ago by the calendar in India', () => {
    expect(daysAgo(at(0), TODAY)).toBe(0)
    expect(daysAgo('2026-11-10T19:00:00Z', TODAY)).toBe(0) // 00:30 on the 11th in India
    expect(daysAgo(at(30), TODAY)).toBe(30)
  })

  it('sets the last 30 days against the 30 before', () => {
    const p = pulse(input({ jokes: [joke(0), joke(29), joke(30), joke(59), joke(60)], observations: [obs(3)] }))
    expect(p.pace).toEqual([{ kind: 'observations', now: 1, before: 0 }, { kind: 'premises', now: 0, before: 0 }, { kind: 'jokes', now: 2, before: 2 }])
  })

  it('follows ideas through, over the last 90 days only', () => {
    const built = premise(10, 'built')
    const p = pulse(input({
      observations: [obs(5, { joke_ids: ['x'] }), obs(6), obs(200, { joke_ids: ['x'] })],
      premises: [built, premise(12), premise(300)],
      jokes: [joke(1, { premise_id: 'built', status: 'Stage Ready' }), joke(2, { punchline: '  ' }), joke(120, { status: 'Complete' })],
    }))
    expect(p.steps.map((s) => [s.done, s.of])).toEqual([[1, 2], [1, 2], [1, 2], [1, 2]])
  })

  it('lists what is sitting idle, with the list that shows it, and leaves out what is not', () => {
    const p = pulse(input({
      observations: [obs(1), obs(2), obs(3, { premise_ids: ['p'] })],
      premises: [premise(4)],
      jokes: [joke(40), joke(45, { status: 'Stage Ready' }), joke(3)],
    }))
    expect(p.idle).toEqual([
      { label: 'observations nothing has come from', count: 2, to: '/observations?unused=1' },
      { label: 'premises with no joke yet', count: 1, to: '/premises?sort=fewest' },
      { label: 'drafts not touched in 30 days', count: 1, to: '/jokes?status=Draft' },
    ])
  })

  it('says nothing until there is enough to go on', () => {
    const p = pulse(input({ jokes: [joke(1)], observations: [obs(1)] }))
    expect([p.thin, p.notes]).toEqual([true, []])
  })

  it('notes a kind gone quiet, the biggest unused pile and when you write', () => {
    const observations = [...Array.from({ length: 6 }, (_, i) => obs(i * 7, { created_at: at(i * 7, 23) })), obs(2, { joke_ids: ['kept'], created_at: at(2, 23) })]
    const jokes = [joke(1, { id: 'kept', created_at: at(1, 23) }), joke(8, { created_at: at(8, 23) }), joke(15, { created_at: at(15, 23) })]
    const p = pulse(input({ observations, jokes, premises: [premise(40)] }))
    expect(p.notes).toEqual([
      'No new premise in 40 days.',
      'Trains holds 7 observations and 1 joke has come from them: 6 are still unused.',
      'You write most on Wednesdays (6 of your last 11 pieces), and mostly at night.',
    ])
  })

  it('names the part of the day', () => {
    expect([5, 12, 17, 22, 2].map(partOfDay)).toEqual(['in the morning', 'in the afternoon', 'in the evening', 'at night', 'at night'])
  })
})
