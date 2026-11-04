/**
 * The joke board is gone, but a phone may still hold a move made on it, waiting to sync. A
 * waiting save finds its function by its key, so the two board keys stay registered forever
 * (queuedKeys.test.ts) and simply let such a save go: there is no board left to move it on.
 */
import { queryClient } from './queryClient'
import { QUEUED } from './sync'

const dropped = async () => undefined

queryClient.setMutationDefaults(['board', 'save'], { ...QUEUED, mutationFn: dropped })
queryClient.setMutationDefaults(['board', 'tidy'], { ...QUEUED, mutationFn: dropped })
