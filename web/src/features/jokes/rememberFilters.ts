/**
 * The Jokes list remembers its filters for a while, so leaving and coming back (another screen,
 * a joke opened from somewhere else, the map) finds them as you left them.
 *
 * Kept in sessionStorage: one browser tab or app window each, gone when it closes. On top of that
 * they lapse after an hour away, so tomorrow's first look is the whole list again. Clear forgets
 * them at once.
 */
const KEY = 'jokes-filters'
const TTL_MS = 60 * 60 * 1000

/** Remember the list's query string ('' when cleared). */
export function remember(query: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ query, at: Date.now() }))
  } catch {
    // Storage blocked (private mode): the filters just aren't remembered.
  }
}

/** The remembered query string, or '' if none or it has lapsed. */
export function recall(now = Date.now()): string {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { query: string; at: number } | null
    return saved && now - saved.at < TTL_MS ? saved.query : ''
  } catch {
    return ''
  }
}
