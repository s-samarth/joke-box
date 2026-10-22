import { describe, expect, it } from 'vitest'
import type { Joke, CraftNote, PerformanceLog } from '../../api/types'
import { averageLpm, formatLpm, lpm } from '../shows/lpm'
import { lessonFrom } from './craftMeta'
import { mostSolidTopic, nextStep, targetMinutes } from './path'

const note = (patch: Partial<CraftNote>): CraftNote => ({
  id: 'x', title: 'Fake', body: '', behaviour: 'path', kind_id: 'k', area_id: 'p', hashtags: [], source: '', url: '', position: 1,
  performance_log_id: null, analysis_id: null, created_at: '', updated_at: '', ...patch,
})

describe('path', () => {
  it('finds the next unticked step in the first path note that has one', () => {
    const done = note({ id: 'a', position: 1, body: '- [x] fake one' })
    const open = note({ id: 'b', position: 2, body: '- [x] fake one\n- [ ] fake two, a solid 10 mins\n- [ ] fake three' })
    const step = nextStep([open, done, note({ behaviour: 'reference', body: '- [ ] not a path' })])
    expect(step && [step.note.id, step.done, step.total, step.next.text]).toEqual(['b', 1, 3, 'fake two, a solid 10 mins'])
    expect(nextStep([done])).toBeNull()
  })

  it('reads minutes from a step', () => {
    expect(targetMinutes('One set of a solid 15 mins on one topic')).toBe(15)
    expect(targetMinutes('An hour of jokes')).toBe(60)
    expect(targetMinutes('Learn improv')).toBeNull()
  })

  it('sums solid material by topic', () => {
    const joke = (topic_id: string, strength: number, duration_seconds: number) => ({ topic_id, strength, duration_seconds }) as Joke
    expect(mostSolidTopic([joke('a', 4, 60), joke('b', 5, 100), joke('a', 5, 60), joke('b', 2, 500)])).toEqual({ topicId: 'a', seconds: 120 })
    expect(mostSolidTopic([joke('a', 3, 60)])).toBeNull()
  })
})

describe('lessons', () => {
  it('names a lesson by its first line', () => {
    expect(lessonFrom('Fake lesson', [], { area_id: 's', kind_id: 'k' })).toMatchObject({ title: 'Fake lesson', body: '', area_id: 's', kind_id: 'k' })
    const long = `${'word '.repeat(30)}end`
    expect(lessonFrom(long, [], { area_id: 's', kind_id: 'k' }).title.length).toBeLessThanOrEqual(81)
    expect(lessonFrom(`Fake title\nmore fake`, [], { area_id: 's', kind_id: 'k' }).body).toBe('Fake title\nmore fake')
  })
})

describe('LPM', () => {
  it('scores laughs per minute and weights shows by length', () => {
    expect(lpm([0, 0, 0, 0, 0], 300)).toBeNull()
    expect(lpm([2, 0, 0, 0, 2], 120)).toBe(6) // (2*1 + 2*5) / 2 minutes
    const log = (laughs: number[] | null, duration_seconds: number) => ({ laughs, duration_seconds }) as PerformanceLog
    expect(averageLpm([log([0, 0, 0, 0, 6], 60), log([0, 0, 0, 0, 0], 60), log([10, 0, 0, 0, 0], 180)])).toEqual({ lpm: 10, shows: 2 })
    expect(formatLpm(12.34)).toBe('12.3 LPM, beast')
  })
})
