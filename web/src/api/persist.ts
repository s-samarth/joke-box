/** How the cache is kept on the phone: shared by the provider in main.tsx and by a tab stepping aside. */
import { dehydrate } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { set } from 'idb-keyval'
import { handedOver } from '../lib/oneTab'
import { CACHE_BUSTER, CACHE_KEY, persister, persistMaxAge, queryClient } from './queryClient'
import { QUEUED } from './sync'

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: persistMaxAge,
  buster: CACHE_BUSTER,
  // Keep every queued save that hasn't finished, not only the paused ones: a save on its way when
  // the app is closed may never have arrived, so it's sent again next time.
  dehydrateOptions: { shouldDehydrateMutation: (m) => m.state.status === 'pending' && m.options.scope?.id === QUEUED.scope.id },
}

let restored = false
/** The saved copy has loaded into the cache (launch.ts), so writing the cache back is safe. */
export const markRestored = () => { restored = true }

/**
 * Write the saved copy now, in the persister's own format. Its writes are throttled, and one asked
 * for while another is waiting returns before anything is written: too late for an app the phone
 * is putting away, or a tab stepping aside for one about to read the copy.
 */
export async function saveNow() {
  // Not before the saved copy has loaded: the cache is still empty, and would go over it.
  if (handedOver() || !restored) return
  const saved = { buster: CACHE_BUSTER, timestamp: Date.now(), clientState: dehydrate(queryClient, persistOptions.dehydrateOptions) }
  await set(CACHE_KEY, JSON.stringify(saved))
}
