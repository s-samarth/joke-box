/** An open joke editor takes a newer copy of the joke only while nothing's been typed. */
import { describe, expect, it } from 'vitest'
import type { JokeInput } from '../../api/types'
import { followNewer } from './useAutosaveJoke'

const input = (setup: string, version = 1) => ({ setup, punchline: 'A made-up punchline', version }) as unknown as JokeInput

describe('an open joke editor', () => {
  it('takes the newer copy when nothing has been typed', () => {
    const shown = input('Old made-up setup')
    const newer = input('Newer made-up setup', 3)
    expect(followNewer(shown, shown, newer, false)).toBe(newer)
  })

  it('keeps what was typed', () => {
    const shown = input('Old made-up setup')
    const typed = input('Old made-up setup, typed on')
    expect(followNewer(typed, shown, input('Newer made-up setup', 3), false)).toBe(typed)
    expect(followNewer(shown, shown, input('Newer made-up setup', 3), true)).toBe(shown)
  })

  it('takes a save answer that only moves the version on', () => {
    const typed = input('Typed made-up setup')
    const answered = input('Typed made-up setup', 2)
    expect(followNewer(typed, input('Typed made-up setup', 1), answered, false)).toBe(answered)
  })
})
