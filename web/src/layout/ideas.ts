/**
 * The phone's Ideas tab holds two screens, Premises and Observations, and opens on whichever you
 * used last. That choice is a per-device habit, like the brainstorm pen, so it lives in
 * localStorage and never syncs. Without storage (a private window) it opens on Premises.
 */

export const IDEAS = [
  { to: '/premises', label: 'Premises' },
  { to: '/observations', label: 'Observations' },
] as const

export type IdeasScreen = (typeof IDEAS)[number]['to']

const KEY = 'jokebox.ideas'

/** Which Ideas screen a path is on (an open premise or observation counts), or null. */
export const ideasScreen = (pathname: string): IdeasScreen | null =>
  IDEAS.find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`))?.to ?? null

/** The Ideas screen you used last on this device. */
export function lastIdeas(): IdeasScreen {
  try {
    return localStorage.getItem(KEY) === '/observations' ? '/observations' : '/premises'
  } catch {
    return '/premises'
  }
}

/** Note the Ideas screen this path is on; any other path changes nothing. */
export function rememberIdeas(pathname: string): void {
  const screen = ideasScreen(pathname)
  if (!screen) return
  try { localStorage.setItem(KEY, screen) } catch { /* private mode */ }
}
