/**
 * The `hit` utility (app.css) widens a control's tap area with an absolutely placed ::after. On a
 * control with no position of its own, that ::after sizes itself to the nearest positioned
 * ancestor instead: in the observation sorter it covered the whole sheet, so every tap, the
 * close button included, landed on the last topic drawn. Every `hit` must come with `relative`
 * or `absolute`.
 */
import { describe, expect, it } from 'vitest'

// Every component's source, as text.
const SOURCES = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true })

/** Class strings (quoted or template) that use `hit` with neither `relative` nor `absolute`. */
function unplaced(code: string): string[] {
  const strings = code.match(/(["'`])(?:(?!\1)[^\n])*\1/g) ?? []
  return strings.filter((s) => /(^|[\s"'`])hit($|[\s"'`])/.test(s) && /\b(h-|px-|rounded|text-)/.test(s) && !/\b(relative|absolute)\b/.test(s))
}

describe('tap areas', () => {
  it('catches a `hit` with no position, as the sorter had', () => {
    const sorter = "const chip = (on: boolean) => `hit h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper' : 'bg-ink-3'}`"
    expect(unplaced(sorter)).toHaveLength(1)
    expect(unplaced("className={`hit relative h-8 rounded-lg px-2.5 text-sm`}")).toEqual([])
  })
  it('every `hit` control has a position of its own', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
    const offenders = Object.entries(SOURCES).flatMap(([file, code]) => unplaced(code).map((s) => `${file}: ${s}`))
    expect(offenders).toEqual([])
  })
})
