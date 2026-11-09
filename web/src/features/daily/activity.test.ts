import { describe, expect, it } from 'vitest'
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { activityByDay, countLabel, countsOf, dayOf, heat, KINDS, monthName, monthSummary, totalOf } from './activity'

const at = <T,>(created_at: string, id = created_at) => ({ id, created_at }) as T
const joke = (iso: string, id?: string) => at<Joke>(iso, id)
const premise = (iso: string, id?: string) => at<Premise>(iso, id)
const obs = (iso: string, id?: string) => at<Observation>(iso, id)

describe('daily activity', () => {
  const activity = activityByDay(
    [joke('2026-11-01T05:00:00Z', 'j1'), joke('2026-11-01T06:00:00Z', 'j2'), joke('2026-11-03T05:00:00Z', 'j3')],
    [premise('2026-11-01T05:00:00Z', 'p1'), premise('2026-11-02T05:00:00Z', 'p2')],
    [obs('2026-11-02T19:00:00Z', 'o1'), obs('2026-10-31T05:00:00Z', 'o2')], // 19:00 UTC on the 2nd is the 3rd in IST
  )

  it('splits each day three ways, in IST', () => {
    expect(countsOf(dayOf(activity, '2026-11-01'))).toEqual({ jokes: 2, premises: 1, observations: 0 })
    expect(countsOf(dayOf(activity, '2026-11-02'))).toEqual({ jokes: 0, premises: 1, observations: 0 })
    expect(countsOf(dayOf(activity, '2026-11-03'))).toEqual({ jokes: 1, premises: 0, observations: 1 })
    expect(dayOf(activity, '2026-11-01').jokes.map((j) => j.id)).toEqual(['j1', 'j2'])
  })

  it('gives an empty day for days with nothing written', () => {
    const empty = dayOf(activity, '2026-11-20')
    expect(countsOf(empty)).toEqual({ jokes: 0, premises: 0, observations: 0 })
    expect(totalOf(countsOf(empty))).toBe(0)
  })

  it('adds up a month only as far as today, and counts joke days apart from active days', () => {
    expect(monthSummary(activity, '2026-11', '2026-11-05')).toEqual({ jokes: 3, premises: 2, observations: 1, total: 6, sofar: 5, active: 3, jokeDays: 2 })
    expect(monthSummary(activity, '2026-11', '2026-11-01')).toMatchObject({ total: 3, sofar: 1 })
    expect(monthSummary(activity, '2026-10', '2026-11-05')).toMatchObject({ observations: 1, sofar: 31, active: 1, jokeDays: 0 })
    expect(monthSummary(activity, '2026-12', '2026-11-05')).toMatchObject({ total: 0, sofar: 0 })
    expect(monthSummary(activity, '2028-02', '2028-12-01').sofar).toBe(29)
  })

  it('brightens a box in steps, and copes with double-digit days', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 30].map(heat)).toEqual([0, 1, 2, 2, 3, 3, 4, 4])
  })

  it('lists observations first and jokes last, like the writing box', () => {
    expect(KINDS).toEqual(['observations', 'premises', 'jokes'])
  })

  it('labels counts and months for people', () => {
    expect([countLabel('jokes', 1), countLabel('premises', 2), countLabel('observations', 12)]).toEqual(['1 joke', '2 premises', '12 observations'])
    expect(monthName('2026-11')).toBe('November 2026')
  })
})
