/**
 * Hooks for free brainstorm sessions (typed text, handwriting, timer and links).
 *
 * The list comes without ink: all your handwriting at once would outgrow the host's 4.5 MB
 * limit. Each session's ink is fetched on its own (gzip-packed) and kept on the device, so a
 * session still opens offline. `keepOnDevice` downloads any whose ink changed since last time.
 */
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, api } from './client'
import { deleteSessionKey, keys, saveSessionKey, sessionKey, type SaveSessionVars } from './queryClient'
import { savesOf } from './sessionSaves'
import { QUEUED } from './sync'
import type { SessionSummary, WritingSession } from './types'

/** One session with its ink, or null if the server has none (a session just started here). */
export async function fetchSession(id: string): Promise<WritingSession | null> {
  try {
    return await api<WritingSession>(`/api/sessions/${id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

/** A save still waiting to sync: the copy on this device is newer than the server's. */
const savesWaiting = (client: QueryClient) =>
  client.isMutating({ predicate: (m) => m.options.scope?.id === QUEUED.scope.id }) > 0

let running = false
let next: SessionSummary[] | null = null

/**
 * Download, one at a time, each session whose ink changed since this device last saw it, and
 * forget sessions deleted elsewhere. Skipped while saves are waiting (it would fetch the server's
 * older copy); once they sync, the list refreshes and this runs again.
 */
export async function keepOnDevice(client: QueryClient, list: SessionSummary[]) {
  if (running) {
    next = list
    return
  }
  running = true
  try {
    for (const s of list) {
      if (savesWaiting(client)) return
      if (client.getQueryData<WritingSession | null>(sessionKey(s.id))?.updated_at === s.updated_at) continue
      await client.fetchQuery({ queryKey: sessionKey(s.id), queryFn: () => fetchSession(s.id), staleTime: 0 }).catch(() => {})
    }
    if (savesWaiting(client)) return
    const listed = new Set(list.map((s) => s.id))
    for (const query of client.getQueryCache().findAll({ queryKey: ['session-detail'] })) {
      // Not one being looked at: that could be a session just started here, not saved yet.
      if (!listed.has(String(query.queryKey[1])) && !query.getObserversCount()) client.removeQueries({ queryKey: query.queryKey, exact: true })
    }
  } finally {
    running = false
    const again = next
    next = null
    if (again) void keepOnDevice(client, again)
  }
}

/** The session list just to read (what an observation was brainstormed in), without keeping each session on the device as the Brainstorm screen does. */
export const useSessionSummaries = () =>
  useQuery({ queryKey: keys.sessionList, queryFn: () => api<SessionSummary[]>('/api/sessions/summaries') })

export function useSessionList() {
  const client = useQueryClient()
  const list = useQuery({ queryKey: keys.sessionList, queryFn: () => api<SessionSummary[]>('/api/sessions/summaries') })
  useEffect(() => {
    if (list.data) void keepOnDevice(client, list.data)
  }, [client, list.data])
  return list
}

/**
 * One session with its ink. While a save of it waits, the copy here is newer than the server's,
 * so it's kept rather than fetched: a fetch then would put the older copy back.
 */
export function readSession(client: QueryClient, id: string): Promise<WritingSession | null> {
  const here = client.getQueryData<WritingSession | null>(sessionKey(id))
  return here && savesOf(id) > 0 ? Promise.resolve(here) : fetchSession(id)
}

export const useSession = (id: string) => {
  const client = useQueryClient()
  return useQuery({ queryKey: sessionKey(id), queryFn: () => readSession(client, id) })
}

export const useSaveSession = () => useMutation<SessionSummary, Error, SaveSessionVars>({ mutationKey: saveSessionKey })

export const useDeleteSession = () => useMutation<void, Error, string>({ mutationKey: deleteSessionKey })
