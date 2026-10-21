/**
 * How much on this phone hasn't reached the server yet: queued saves plus recordings still to
 * upload (those that failed for good aren't waiting), and whether they're stuck on a sign-in.
 */
import { useIsMutating, useMutationState } from '@tanstack/react-query'
import { QUEUED, needsSignIn } from '../api/sync'
import { useOutbox } from '../features/voice/outbox'

export function useWaiting() {
  const saves = useIsMutating({ predicate: (m) => m.options.scope?.id === QUEUED.scope.id })
  const recordings = useOutbox().items.filter((n) => !n.failed).length
  const signIn = useMutationState({
    filters: { status: 'pending', predicate: (m) => needsSignIn(m.state.failureReason) },
    select: (m) => m.mutationId,
  }).length > 0
  return { count: saves + recordings, needsSignIn: signIn }
}
