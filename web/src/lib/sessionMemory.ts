/**
 * Short-term memory for screen state, like list filters: kept in sessionStorage (one browser tab or
 * app window each, gone when it closes) and forgotten after an hour away, so a fresh start shows
 * everything again. Storage can be blocked (private mode); then nothing is remembered.
 */
const TTL_MS = 60 * 60 * 1000

export function remember<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() }))
  } catch {
    // Not remembered; the screen still works.
  }
}

/** What was remembered under this key, or undefined if nothing or it has lapsed. */
export function recall<T>(key: string, now = Date.now()): T | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as { value: T; at: number } | null
    return saved && now - saved.at < TTL_MS ? saved.value : undefined
  } catch {
    return undefined
  }
}
