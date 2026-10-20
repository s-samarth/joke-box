import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/** True while the browser has a connection (TanStack Query tracks this for us). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
  )
}
