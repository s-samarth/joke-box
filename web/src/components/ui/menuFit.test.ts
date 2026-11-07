/**
 * Every menu panel stays on a phone screen: it's capped at Radix's measured room, so a long list
 * (every topic, then Manage topics) scrolls instead of running under the bottom bar. A panel built
 * on Radix directly, without that cap, is the bug this test keeps from coming back.
 */
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>('../../**/*.tsx', { query: '?raw', import: 'default', eager: true })

/** Each `<DropdownMenu.Content …>` or `<ContextMenu.Content …>` opening tag, with its file. */
function panels(): { file: string; tag: string }[] {
  return Object.entries(sources).flatMap(([file, text]) =>
    [...text.matchAll(/<(?:DropdownMenu|ContextMenu)\.Content\b[^>]*>/g)].map((m) => ({ file, tag: m[0] })))
}

describe('menu panels', () => {
  it('read the app source', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
    expect(panels().length).toBeGreaterThan(0)
  })
  it('are all capped to the room on screen', () => {
    const shared = /className=\{(dropdownPanel|contextPanel)\}/
    const loose = panels().filter(({ tag }) => !tag.includes('available-height') && !shared.test(tag))
    expect(loose).toEqual([])
  })
})
