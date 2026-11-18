/**
 * One refresh at a time: pulling again while it spins doesn't start a second one. `source` says
 * what started it, so the arrow stays up only for a refresh you pulled for.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { refreshNow } from '../api/refresh'
import { useFeedback } from '../components/ui/feedbackContext'

type Source = 'pull'

let running: Source | null = null
const listeners = new Set<() => void>()
const setRunning = (value: Source | null) => {
  running = value
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRefresh() {
  const source = useSyncExternalStore(subscribe, () => running)
  const { toast } = useFeedback()
  const run = useCallback(async (from: Source) => {
    if (running) return
    setRunning(from)
    try {
      if ((await refreshNow()) === 'offline') toast("You're offline: showing what's on this device")
    } finally {
      setRunning(null)
    }
  }, [toast])
  return { source, refreshing: source !== null, run }
}
