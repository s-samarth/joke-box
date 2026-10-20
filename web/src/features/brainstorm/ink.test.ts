import { describe, expect, it } from 'vitest'
import type { Stroke } from '../../api/types'
import { eraseAt, pageCount, removePage, replacePage, strokesOn, undoOn } from './ink'

const stroke = (page: number | undefined, x = 100, y = 100): Stroke => ({ color: '#fff', size: 2.4, page, points: [[x, y, 0.5]] })

describe('handwriting pages', () => {
  it('puts strokes saved before pages existed on the first page', () => {
    const old = stroke(undefined)
    expect(strokesOn([old, stroke(1)], 0)).toEqual([old])
  })

  it('counts pages from the saved count or the furthest stroke', () => {
    expect(pageCount([], undefined)).toBe(1)
    expect(pageCount([stroke(0)], 3)).toBe(3)
    expect(pageCount([stroke(4)], 2)).toBe(5)
  })

  it('replaces one page and leaves the others', () => {
    const [a, b, c] = [stroke(0), stroke(1), stroke(1, 300)]
    expect(replacePage([a, b], 1, [c])).toEqual([a, c])
  })

  it('undoes the newest stroke on the current page only', () => {
    const [a, b, c] = [stroke(0), stroke(1), stroke(0, 300)]
    expect(undoOn([a, b, c], 1)).toEqual([a, c])
    expect(undoOn([a, b, c], 0)).toEqual([a, b])
    expect(undoOn([a], 2)).toEqual([a])
  })

  it('deleting a page moves the later pages up', () => {
    const result = removePage([stroke(0), stroke(1), stroke(2)], 1)
    expect(result.map((s) => s.page)).toEqual([0, 1])
  })

  it('the eraser takes whole strokes', () => {
    const long: Stroke = { color: '#fff', size: 2.4, points: [[0, 0, 0.5], [500, 500, 0.5]] }
    expect(eraseAt([long, stroke(0, 900, 900)], 500, 500)).toHaveLength(1)
  })
})
