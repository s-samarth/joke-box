/**
 * Brainstorm sessions autosave queued, so a session written offline syncs later. The list leaves
 * out the ink (it outgrows the host's size limit); each session's ink is its own query, kept on
 * the device indefinitely so a session opens offline (see sessions.ts). main.tsx imports this
 * file up front, so the defaults exist before waiting saves replay.
 *
 * Each save sends the version the editor opened (see ownVersions.ts). One the server refuses,
 * because the session was changed on another device meanwhile, is kept as a copy (sessionClash.ts).
 */
import { ApiError, api } from './client'
import { ownVersions } from './ownVersions'
import { deleteSessionKey, keys, queryClient, refreshWhenSynced, saveSessionKey, sessionKey, toSummary, type SaveSessionVars } from './queryClient'
import { copyTitle, keepBoth, movedTo } from './sessionClash'
import { splitLongStrokes, tooBig } from './sessionLimits'
import { QUEUED, dropOlderWaiting } from './sync'
import type { SessionSummary, WritingSession, WritingSessionInput } from './types'

const ownSessions = ownVersions('session-own-versions')

/** How many saves of this session haven't finished (one that's being sent counts itself). */
export const savesOf = (id: string) =>
  queryClient.getMutationCache().findAll({
    mutationKey: saveSessionKey,
    exact: true,
    predicate: (m) => m.state.status === 'pending' && (m.state.variables as SaveSessionVars | undefined)?.id === id,
  }).length

type Fields = Omit<WritingSessionInput, 'version'>

/** Save to `id` from version `from`, sent based on this device's own chain of versions. */
async function put(id: string, fields: Fields, from: number | undefined) {
  const base = ownSessions.baseFor(id, from)
  // The server always answers with the version; only copies cached before versions lack one.
  const saved = await api<SessionSummary & { version: number }>(`/api/sessions/${id}`, 'PUT', { ...fields, base_version: base })
  ownSessions.record(id, from, base, saved.version)
  return saved
}

const isClash = (e: unknown) => e instanceof ApiError && e.status === 409

/**
 * Save to the session, or to this device's copy of it once the two have parted. A save refused
 * as a clash moves to a new copy; so does one refused on a copy (opened and changed elsewhere).
 */
async function saveSomewhere(id: string, fields: Fields, from: number | undefined) {
  const moved = movedTo(id, from)
  try {
    return moved ? { target: moved, saved: await put(moved, { ...fields, title: copyTitle(fields.title) }, ownSessions.latest(moved)) } : { target: id, saved: await put(id, fields, from) }
  } catch (e) {
    if (!isClash(e)) throw e
    const copy = keepBoth(id, from)
    return { target: copy, saved: await put(copy, { ...fields, title: copyTitle(fields.title) }, undefined) }
  }
}

queryClient.setMutationDefaults(saveSessionKey, {
  ...QUEUED,
  mutationFn: async ({ id, input }: SaveSessionVars) => {
    const { version: from, ...fields } = { ...input, ink: splitLongStrokes(input.ink) }
    // Over the server's limits it would only be refused, at every autosave: refused here instead.
    const problem = tooBig(fields)
    if (problem) throw new ApiError(413, problem)
    const { target, saved } = await saveSomewhere(id, fields, from)
    // Keep what was saved, with the server's time, so this copy reads as current and isn't
    // downloaded again. Only the time on whatever copy was here wasn't enough: an older copy
    // fetched meanwhile would then pass for the saved one. Not while a newer save of it waits:
    // the copy here is that newer one already.
    if (savesOf(id) <= 1) {
      queryClient.setQueryData<WritingSession>(sessionKey(target), { ...fields, title: saved.title, id: target, version: saved.version, created_at: saved.created_at, updated_at: saved.updated_at })
    }
    return saved
  },
  onMutate: async ({ id, input }: SaveSessionVars) => {
    dropOlderWaiting(queryClient, saveSessionKey, id) // this save has it all: older waiting copies go
    // Once this device's edits have moved to a copy, they show there, not over the other version.
    const moved = movedTo(id, input.version)
    const target = moved ?? id
    await queryClient.cancelQueries({ queryKey: keys.sessionList })
    await queryClient.cancelQueries({ queryKey: sessionKey(target) })
    const known = queryClient.getQueryData<WritingSession | null>(sessionKey(target))
      ?? queryClient.getQueryData<SessionSummary[]>(keys.sessionList)?.find((s) => s.id === target)
    const now = new Date().toISOString()
    const shown = moved ? { ...input, title: copyTitle(input.title), version: known?.version } : input
    const next: WritingSession = { ...shown, id: target, created_at: known?.created_at ?? now, updated_at: now }
    queryClient.setQueryData(sessionKey(target), next)
    queryClient.setQueryData<SessionSummary[]>(keys.sessionList, (old = []) => [toSummary(next), ...old.filter((s) => s.id !== target)])
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
