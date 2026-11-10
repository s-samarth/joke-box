/**
 * Where the page should be scrolled to after moving between screens. The app is one long-lived
 * page, so the browser keeps whatever scroll the last screen had: open a joke from far down the
 * list and you landed far down the joke, and its way back dropped you somewhere else in the list.
 *
 * The rules, as a phone app behaves:
 * - A new screen opens at its top.
 * - Back (the browser's, or a swipe) returns to where that screen was left.
 * - A screen's own way back to its list ("← Jokes", from /jokes/123 to /jokes) returns to where
 *   the list was left, if it's the same list (same filters).
 * - Changing only what's after the ? (a filter, a sheet) leaves the scroll alone.
 */
export type NavKind = 'POP' | 'PUSH' | 'REPLACE'

export interface Place {
  key: string
  pathname: string
  search: string
}

export interface Memory {
  /** The scroll of each history entry, by its key. */
  byKey: Map<string, number>
  /** The last scroll of each path, with the filters it had then. */
  byPath: Map<string, { search: string; y: number }>
}

export const newMemory = (): Memory => ({ byKey: new Map(), byPath: new Map() })

export function remember(memory: Memory, place: Place, y: number): void {
  memory.byKey.set(place.key, y)
  memory.byPath.set(place.pathname, { search: place.search, y })
}

/** The scroll to move to after going `from` → `to`, or null to leave it where it is. */
export function scrollAfter(kind: NavKind, from: Place | null, to: Place, memory: Memory): number | null {
  if (!from) return null // the app just opened: nothing to undo
  if (kind === 'POP') return memory.byKey.get(to.key) ?? 0
  if (from.pathname === to.pathname) return null
  if (from.pathname.startsWith(`${to.pathname}/`)) {
    const left = memory.byPath.get(to.pathname)
    return left && left.search === to.search ? left.y : 0
  }
  return 0
}
