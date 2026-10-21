import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/** True while the server can be reached (see api/network.ts; TanStack Query holds the flag). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
  )
}
