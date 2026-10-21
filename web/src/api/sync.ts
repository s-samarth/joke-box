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
 * - **scope:** saves go to the server one at a time, in the order you made them. A joke written
 *   offline reaches the server before the set it was added to, and two quick edits to the same
 *   joke can't land the wrong way round.
 */
import { ApiError } from './client'
import { NetworkError, isConnectionFailure } from './network'

const SERVER_TRIES = 3
const NETWORK_TRIES = 20

export function retrySync(failures: number, error: unknown): boolean {
  if (error instanceof NetworkError || isConnectionFailure(error)) return failures < NETWORK_TRIES
  if (error instanceof ApiError) return (error.status >= 500 || [408, 429].includes(error.status)) && failures < SERVER_TRIES
  return false
}

/** 1s, 2s, 4s... up to 30s between tries. */
const backoff = (failures: number) => Math.min(1000 * 2 ** failures, 30_000)

export const QUEUED = {
  networkMode: 'online',
  retry: retrySync,
  retryDelay: backoff,
  scope: { id: 'sync' },
} as const
