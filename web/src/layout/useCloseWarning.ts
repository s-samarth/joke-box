/**
 * With several tabs allowed, each tab keeps its own waiting saves, and another tab can overwrite
 * the copy on the phone. So closing a tab whose saves haven't synced asks first. (Recordings
 * wait in their own shared store, so they're safe either way.)
 */
import { useIsMutating } from '@tanstack/react-query'
import { useEffect } from 'react'
import { QUEUED } from '../api/sync'
import { manyTabs } from '../lib/oneTab'

export function useCloseWarning() {
  const waiting = useIsMutating({ predicate: (m) => m.options.scope?.id === QUEUED.scope.id }) > 0
  useEffect(() => {
    if (!waiting) return
    // The browser shows its own "Leave site?" box; the text can't be changed.
    const ask = (e: BeforeUnloadEvent) => { if (manyTabs()) e.preventDefault() }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [waiting])
}
