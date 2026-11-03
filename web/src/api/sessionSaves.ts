/**
 * Brainstorm sessions autosave queued, so a session written offline syncs later. The list leaves
 * out the ink (it outgrows the host's size limit); each session's ink is its own query, kept on
 * the device indefinitely so a session opens offline (see sessions.ts). main.tsx imports this
 * file up front, so the defaults exist before waiting saves replay.
 */
import { ApiError, api } from './client'
import { deleteSessionKey, keys, queryClient, refreshWhenSynced, saveSessionKey, sessionKey, toSummary, type SaveSessionVars } from './queryClient'
import { splitLongStrokes, tooBig } from './sessionLimits'
import { QUEUED, dropOlderWaiting } from './sync'
import type { SessionSummary, WritingSession } from './types'

/** How many saves of this session haven't finished (one that's being sent counts itself). */
export const savesOf = (id: string) =>
  queryClient.getMutationCache().findAll({
    mutationKey: saveSessionKey,
    exact: true,
    predicate: (m) => m.state.status === 'pending' && (m.state.variables as SaveSessionVars | undefined)?.id === id,
  }).length

queryClient.setMutationDefaults(saveSessionKey, {
  ...QUEUED,
  mutationFn: async ({ id, input }: SaveSessionVars) => {
    const ready = { ...input, ink: splitLongStrokes(input.ink) }
    // Over the server's limits it would only be refused, at every autosave: refused here instead.
    const problem = tooBig(ready)
    if (problem) throw new ApiError(413, problem)
    const saved = await api<SessionSummary>(`/api/sessions/${id}`, 'PUT', ready)
    // Keep what was saved, with the server's time, so this copy reads as current and isn't
    // downloaded again. Only the time on whatever copy was here wasn't enough: an older copy
    // fetched meanwhile would then pass for the saved one. Not while a newer save of it waits:
    // the copy here is that newer one already.
    if (savesOf(id) <= 1) {
      queryClient.setQueryData<WritingSession>(sessionKey(id), { ...input, id, created_at: saved.created_at, updated_at: saved.updated_at })
    }
    return saved
  },
  onMutate: async ({ id, input }: SaveSessionVars) => {
    dropOlderWaiting(queryClient, saveSessionKey, id) // this save has it all: older waiting copies go
    await queryClient.cancelQueries({ queryKey: keys.sessionList })
    await queryClient.cancelQueries({ queryKey: sessionKey(id) })
    const known = queryClient.getQueryData<WritingSession | null>(sessionKey(id))
      ?? queryClient.getQueryData<SessionSummary[]>(keys.sessionList)?.find((s) => s.id === id)
    const now = new Date().toISOString()
    const next: WritingSession = { ...input, id, created_at: known?.created_at ?? now, updated_at: now }
    queryClient.setQueryData(sessionKey(id), next)
    queryClient.setQueryData<SessionSummary[]>(keys.sessionList, (old = []) => [toSummary(next), ...old.filter((s) => s.id !== id)])
  },
  onSettled: () => refreshWhenSynced(keys.sessionList),
})

queryClient.setMutationDefaults(deleteSessionKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/sessions/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.sessionList })
    queryClient.setQueryData<SessionSummary[]>(keys.sessionList, (old = []) => old.filter((s) => s.id !== id))
    queryClient.removeQueries({ queryKey: sessionKey(id), exact: true })
  },
  onSettled: () => refreshWhenSynced(keys.sessionList),
})
