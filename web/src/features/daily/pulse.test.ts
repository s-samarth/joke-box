// Made-up material only. tests/test_connector_pulse.py runs the same cases with the same answers.
import { describe, expect, it } from 'vitest'
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { daysAgo, pulse, type PulseInput } from './pulse'
import { partIndex } from './pulseTrends'

const TODAY = '2026-11-11'
/** `hour` o'clock in India, `ago` days before TODAY. */
const at = (ago: number, hour = 12) => new Date(Date.UTC(2026, 10, 11 - ago, hour - 5, -30)).toISOString()

let n = 0
const joke = (ago: number, extra: Partial<Joke> = {}): Joke =>
  ({ id: `j${++n}`, setup: 'A made-up setup', punchline: 'A made-up punch', status: 'Draft', premise_id: null, created_at: at(ago), updated_at: at(ago), ...extra }) as Joke
const premise = (ago: number, id = `p${++n}`, status: Premise['status'] = 'Draft'): Premise =>
  ({ id, take: 'A made-up take', notes: '', topic_id: 't1', strength: null, status, version: 1, created_at: at(ago), updated_at: at(ago) })
const obs = (ago: number, extra: Partial<Observation> = {}): Observation =>
  ({ id: `o${++n}`, text: 'Made-up thing noticed', topic_id: 't1', kind_id: null, premise_ids: [], joke_ids: [], version: 1, created_at: at(ago), updated_at: at(ago), ...extra }) as Observation
const used = { joke_ids: ['x'] }

const input = (lists: Partial<PulseInput>): PulseInput => ({
  jokes: [], premises: [], observations: [], today: TODAY,
  used: (o) => o.joke_ids.length + o.premise_ids.length > 0,
  topicName: (id) => (id === 't1' ? 'Trains' : 'Random'),
  statusOrder: ['Draft', 'Work in Progress', 'Stage Ready', 'Discarded'],
  ...lists,
})

describe('writing pulse', () => {
  it('counts days ago by the calendar in India', () => {
    expect(daysAgo(at(0), TODAY)).toBe(0)
    expect(daysAgo('2026-11-10T19:00:00Z', TODAY)).toBe(0) // 00:30 on the 11th in India
    expect(daysAgo(at(30), TODAY)).toBe(30)
  })

  it('follows ideas through, over the last 90 days only', () => {
    const p = pulse(input({
      observations: [obs(5, used), obs(6), obs(200, used)],
      premises: [premise(10, 'built'), premise(12), premise(300)],
      jokes: [joke(1, { premise_id: 'built', status: 'Stage Ready' }), joke(2), joke(120, { status: 'Stage Ready' })],
    }))
    expect(p.steps.map((s) => [s.done, s.of])).toEqual([[1, 2], [1, 2], [1, 2]])
    expect(p.narrowest).toBeNull() // no step has five ideas in it yet
  })

  it('calls out the narrowest step once a step has enough in it', () => {
    const p = pulse(input({
      observations: [obs(1, used), obs(2, used), obs(3, used), obs(4), obs(5)],
      premises: [premise(1, 'a'), premise(2), premise(3), premise(4), premise(5)],
      jokes: [joke(1, { premise_id: 'a', status: 'Stage Ready' }), joke(2, { status: 'Stage Ready' }), joke(3), joke(4), joke(5)],
    }))
    expect(p.narrowest?.label).toBe('Premises with a joke on them')
  })

  it('splits each kind by where it stands, jokes in your status order', () => {
    const p = pulse(input({
      observations: [obs(1, { ...used, status: 'Stage Ready' }), obs(2), obs(3)],
      premises: [premise(1, 'a', 'Work in Progress'), premise(2, 'b', 'Discarded'), premise(3)],
      jokes: [joke(1, { status: 'Need Tags' }), joke(2, { status: 'Stage Ready' }), joke(3, { status: null }), joke(4)],
    }))
    expect(p.standing.map((s) => s.parts.map((x) => [x.label, x.count]))).toEqual([
      [['Draft', 2], ['Work in Progress', 0], ['Stage Ready', 1], ['Discarded', 0]],
      [['Draft', 1], ['Work in Progress', 1], ['Stage Ready', 0], ['Discarded', 1]],
      [['Draft', 2], ['Stage Ready', 1], ['Need Tags', 1]],
    ])
  })

  it('lists what is sitting idle, with the list that shows it, and leaves out what is not', () => {
    const p = pulse(input({
      observations: [obs(1), obs(2), obs(3, { premise_ids: ['p'] })],
      premises: [premise(4)],
      jokes: [joke(40), joke(45, { status: 'Stage Ready' }), joke(3)],
    }))
    expect(p.idle).toEqual([
      { label: 'observations unused', count: 2, to: '/observations?unused=1' },
      { label: 'premises with no joke', count: 1, to: '/premises?sort=fewest' },
      { label: 'drafts untouched for 30 days', count: 1, to: '/jokes?status=Draft' },
    ])
  })

  it('says nothing until there is enough to go on', () => {
    const p = pulse(input({ jokes: [joke(1)], observations: [obs(1)] }))
    expect([p.thin, p.notes, p.narrowest, p.rhythm]).toEqual([true, [], null, null])
  })

  it('notes a kind gone quiet and the biggest unused pile', () => {
    const observations = [...Array.from({ length: 6 }, (_, i) => obs(i * 7)), obs(2, { joke_ids: ['kept'] })]
    const p = pulse(input({ observations, jokes: [joke(1, { id: 'kept' }), joke(8), joke(15)], premises: [premise(40)] }))
    expect(p.notes).toEqual([
      'No new premise in 40 days.',
      'Trains holds 7 observations and 1 joke has come from them: 6 are still unused.',
    ])
  })

  it('goes month on month by what was written that month, recent months still settling', () => {
    const p = pulse(input({
      observations: [obs(0, used), obs(15), obs(45, used)], // 11 Nov, 27 Oct, 27 Sep
      jokes: [joke(15, { status: 'Stage Ready' }), joke(160)], // 27 Oct, 4 Jun
    }))
    expect(p.months.map((m) => [m.month, m.written, m.settling])).toEqual([
      ['2026-06', 1, false], ['2026-07', 0, false], ['2026-08', 0, false],
      ['2026-09', 1, false], ['2026-10', 2, true], ['2026-11', 1, true],
    ])
    expect(p.months[4].steps.map((s) => [s.done, s.of])).toEqual([[0, 1], [0, 0], [1, 1]])
  })

  it('finds when you write, by weekday and part of the day', () => {
    const p = pulse(input({ observations: [...Array.from({ length: 8 }, () => obs(0, { created_at: at(0, 23) })), obs(1, { created_at: at(1, 9) }), obs(7, { created_at: at(7, 23) })] }))
    expect(p.rhythm?.busiest).toEqual({ day: 'Wednesdays', part: 'Night', count: 9 })
    expect([p.rhythm?.total, p.rhythm?.grid[1][0]]).toEqual([10, 1])
  })

  it('names the part of the day', () => {
    expect([5, 12, 17, 22, 2].map(partIndex)).toEqual([0, 1, 2, 3, 3])
  })
})
