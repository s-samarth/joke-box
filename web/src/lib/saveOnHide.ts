/**
 * Saving before the phone puts the app away. iOS often skips `pagehide` when you switch apps or
 * lock the phone: only `visibilitychange` to hidden is sure, and the app may then be frozen or
 * ended without another word. So each editor sends its waiting change on either (onHide), and
 * the saved copy is then written to the phone at once (writeWhenHidden), not after the
 * persister's throttle, which may still be waiting when the app stops.
 */
const flushers = new Set<() => void>()

/** Send every editor's waiting change now: the app is going away, or a tab is handing over. */
export const flushAll = () => flushers.forEach((flush) => flush())

/** In an editor: send the waiting change when the page is hidden or closed. Returns the undo. */
export function onHide(flush: () => void): () => void {
  const hidden = () => { if (document.visibilityState === 'hidden') flush() }
  flushers.add(flush)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', hidden)
  return () => {
    flushers.delete(flush)
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', hidden)
  }
}

/** Once, at launch: as the app is hidden, send every waiting change and write the saved copy. */
export function writeWhenHidden(write: () => Promise<void>) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    flushAll()
    void write().catch(() => {}) // storage refused: the throttled copy still follows
  })
}
