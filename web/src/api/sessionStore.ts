/**
 * Each brainstorm session's ink, kept on the device under its own IndexedDB key instead of inside
 * the saved copy of the cache. The saved copy is written whole every time anything changes (at
 * most every 300 ms), and with every session's handwriting in it that was megabytes per write:
 * typing lagged on a phone. Here a session is written only when it changes, and alone.
 *
 * The cache stays the source: a session-detail query added or updated is written here a moment
 * later, one removed is deleted. At launch they're read back into the cache (`sessionsRestored`),
 * which the session queries wait for, so a session still opens offline.
 */
import { clear, createStore, del, entries, set } from 'idb-keyval'
import { handedOver } from '../lib/oneTab'
import { queryClient, sessionKey } from './queryClient'
import type { WritingSession } from './types'

const store = createStore('jokebox-sessions', 'ink')
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let restoring = true

const isSession = (key: readonly unknown[]) => key[0] === 'session-detail' && typeof key[1] === 'string'

function writeLater(id: string) {
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => {
    timers.delete(id)
    if (handedOver()) return // another tab owns the device's copy now
    const data = queryClient.getQueryData<WritingSession | null>(sessionKey(id))
    void (data ? set(id, { data, at: queryClient.getQueryState(sessionKey(id))?.dataUpdatedAt ?? 0 }, store) : del(id, store)).catch(() => {})
  }, 300))
}

queryClient.getQueryCache().subscribe((event) => {
  if (restoring || !isSession(event.query.queryKey)) return
  if (event.type === 'added' || event.type === 'removed' || (event.type === 'updated' && event.action.type === 'success')) {
    writeLater(String(event.query.queryKey[1]))
  }
})

/** Read every kept session back into the cache. Started once at launch (main.tsx). */
export const sessionsRestored: Promise<void> = (async () => {
  try {
    for (const [id, kept] of await entries<string, { data: WritingSession; at: number }>(store)) {
      const known = queryClient.getQueryState(sessionKey(id))
      if (!known || known.dataUpdatedAt < kept.at) queryClient.setQueryData(sessionKey(id), kept.data, { updatedAt: kept.at })
    }
  } catch {
    // storage unavailable: sessions come from the server
  } finally {
    restoring = false
    // Sessions that came with the cache's own saved copy (from before this store) move over.
    for (const q of queryClient.getQueryCache().findAll({ queryKey: ['session-detail'] })) writeLater(String(q.queryKey[1]))
  }
})()

/** Signing out: nothing stays on the device. */
export const forgetSessions = () => clear(store).catch(() => {})
