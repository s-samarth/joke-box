/** How the cache is kept on the phone: shared by the provider in main.tsx and by a tab stepping aside. */
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { CACHE_BUSTER, persister, persistMaxAge } from './queryClient'
import { QUEUED } from './sync'

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: persistMaxAge,
  buster: CACHE_BUSTER,
  // Keep every queued save that hasn't finished, not only the paused ones: a save on its way when
  // the app is closed may never have arrived, so it's sent again next time.
  dehydrateOptions: { shouldDehydrateMutation: (m) => m.state.status === 'pending' && m.options.scope?.id === QUEUED.scope.id },
}
