/**
 * The options every queued save shares: the saves that keep working offline and sync later
 * (jokes, observations, shows, sets, notes...). Spread into each one's `setMutationDefaults`.
 *
 * - **networkMode 'online':** offline, the save pauses instead of failing, and the cache persister
 *   keeps it on the phone, so it survives the app being closed.
 * - **retry:** a save that couldn't reach the server (one bar in a basement) is tried again until
 *   it gets through; it pauses while we're offline, so waiting hours costs no tries. One that
 *   keeps failing while the server answers /health fine is stuck, and would hold up the saves
 *   behind it, so after NETWORK_TRIES it gives up (into the "Couldn't sync" list, nothing lost).
 *   A server hiccup gets a few more tries. A refusal (bad input, not found) stops there.
 *   Signed out (401: the sign-in ran out) isn't a refusal: the save waits, checking each minute,
 *   until you sign in again, then goes through.
 * - **scope:** saves go to the server one at a time, in the order you made them. A joke written
 *   offline reaches the server before the set it was added to, and two quick edits to the same
 *   joke can't land the wrong way round.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { ApiError } from './client'
import { NetworkError, isConnectionFailure } from './network'

const SERVER_TRIES = 3
const NETWORK_TRIES = 20

const signedOut = (error: unknown) => error instanceof ApiError && error.status === 401

export function retrySync(failures: number, error: unknown): boolean {
  if (signedOut(error)) return true
  if (error instanceof NetworkError || isConnectionFailure(error)) return failures < NETWORK_TRIES
  if (error instanceof ApiError) return (error.status >= 500 || [408, 429].includes(error.status)) && failures < SERVER_TRIES
  return false
}

/** 1s, 2s, 4s... up to 30s between tries; a minute while signed out. */
const backoff = (failures: number, error: unknown) => (signedOut(error) ? 60_000 : Math.min(1000 * 2 ** failures, 30_000))

/** Waiting only because the sign-in ran out: worth telling you, since only you can fix it. */
export const needsSignIn = signedOut

export const QUEUED = {
  networkMode: 'online',
  retry: retrySync,
  retryDelay: backoff,
  scope: { id: 'sync' },
} as const

/**
 * Keep only the newest waiting save of something sent whole each time. A brainstorm session
 * autosaves its full text and handwriting at every pause, so offline each pause queued another
 * full copy: an hour of drawing left hundreds, all kept on the phone and sent one by one later.
 * Each copy holds everything the older ones did, so dropping those loses nothing. Only saves not
 * yet sent are dropped (paused); one already on its way is left to finish.
 */
export function dropOlderWaiting(client: QueryClient, mutationKey: QueryKey, id: string) {
  const cache = client.getMutationCache()
  const same = cache.findAll({
    mutationKey,
    exact: true,
    predicate: (m) => m.state.status === 'pending' && (m.state.variables as { id?: unknown } | undefined)?.id === id,
  })
  const newest = Math.max(...same.map((m) => m.mutationId))
  same.filter((m) => m.state.isPaused && m.mutationId !== newest).forEach((m) => cache.remove(m))
}
