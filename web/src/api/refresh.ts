/**
 * Refresh on demand: pull down at the top of a screen (a finger on a phone or iPad, a two-finger
 * swipe on a laptop). Lists otherwise count as fresh for 5 minutes (staleTime, see queryClient.ts),
 * so this is how you see a change made on another device, or by Claude, straight away.
 */
import { isOnline } from './network'
import { queryClient, resumeQueued } from './queryClient'

/** How long to wait for your own waiting saves before fetching anyway. */
const QUEUE_WAIT = 8_000

export type RefreshResult = 'refreshed' | 'offline'

export async function refreshNow(wait = QUEUE_WAIT): Promise<RefreshResult> {
  if (!isOnline()) return 'offline'
  // Your waiting saves go first: fetching before they land would show the server's older copy,
  // and the change you just made would seem to vanish for a moment. A save stuck on a weak signal
  // doesn't hold the refresh up for long.
  await Promise.race([resumeQueued(), new Promise((resolve) => setTimeout(resolve, wait))])
  // Refetches the lists on screen now; every other list is marked old and refetches when opened.
  await queryClient.invalidateQueries()
  return 'refreshed'
}
