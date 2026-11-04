import { describe, expect, it } from 'vitest'
import { MAX_POINTS, MAX_STROKES, splitLongStrokes, strokeCount, tooBig } from './sessionLimits'
import type { Stroke, WritingSessionInput } from './types'

const stroke = (points: number): Stroke => ({ color: '#fff', size: 2, page: 0, points: Array.from({ length: points }, (_, i) => [i, i, 0.5]) })
const input = (ink: Stroke[], extra: Partial<WritingSessionInput> = {}): WritingSessionInput => ({
  title: 'Fake', content: '', ink, ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [], technique_id: null, ...extra,
})

describe('session limits', () => {
  it('splits a stroke too long for the server into joined pieces', () => {
    const pieces = splitLongStrokes([stroke(12_000)])
    expect(pieces.every((p) => p.points.length <= MAX_POINTS)).toBe(true)
    expect(pieces.length).toBe(strokeCount([stroke(12_000)]))
    // Each piece starts where the last one ended, and every point is kept.
    for (let i = 1; i < pieces.length; i++) expect(pieces[i].points[0]).toEqual(pieces[i - 1].points.at(-1))
    expect(pieces.at(-1)!.points.at(-1)).toEqual([11_999, 11_999, 0.5])
  })

  it('leaves ordinary strokes alone', () => {
    const ink = [stroke(10), stroke(MAX_POINTS)]
    expect(splitLongStrokes(ink)).toBe(ink)
  })

  it('says why a session is too big, before it is sent', () => {
    expect(tooBig(input([stroke(3)]))).toBeNull()
    expect(tooBig(input(Array.from({ length: MAX_STROKES + 1 }, () => stroke(2))))).toMatch(/10,000 strokes/)
    expect(tooBig(input([], { title: 'x'.repeat(201) }))).toMatch(/title/)
  })
})
