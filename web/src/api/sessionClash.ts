/**
 * A brainstorm session edited on two devices keeps both. Handwriting can't be rewritten from
 * memory, so unlike a joke or a set there's no Keep mine that throws one version away: when the
 * server refuses this device's save (the session moved on elsewhere), what this device wrote is
 * saved as a new session, a copy, next to the other device's version. Dropbox and Obsidian Sync
 * do the same with a "conflicted copy".
 *
 * The move is remembered per session and per version the editor opened, so the rest of that
 * editing (later autosaves, a save retried after a dropped answer, the session reopened from this
 * device's copy) goes to the same copy instead of clashing again. Kept in the cache, so it holds
 * across a relaunch.
 */
import { useQuery } from '@tanstack/react-query'
import { queryClient } from './queryClient'

type Moved = Record<string, { from: number; to: string }>
const movedKey = ['session-moved']
queryClient.setQueryDefaults(movedKey, { gcTime: Infinity })

const SUFFIX = '(copy, edited on two devices)'

/** The copy's title: the session's own, said to be a copy, within the 200 characters allowed. */
export const copyTitle = (title: string) => {
  const own = title.trim().slice(0, 200 - SUFFIX.length - 1)
  return own ? `${own} ${SUFFIX}` : SUFFIX
}

const find = (all: Moved | undefined, id: string, from: number | undefined) => {
  const moved = all?.[id]
  return moved && moved.from === (from ?? 0) ? moved.to : undefined
}

/** Where saves of this session, edited from version `from`, go now: a copy's id, or none. */
export const movedTo = (id: string, from: number | undefined) => find(queryClient.getQueryData<Moved>(movedKey), id, from)

/** Send this device's edits of the session, made from `from`, to a new copy. Returns its id. */
export function keepBoth(id: string, from: number | undefined): string {
  const copy = crypto.randomUUID()
  queryClient.setQueryData<Moved>(movedKey, (all = {}) => ({ ...all, [id]: { from: from ?? 0, to: copy } }))
  return copy
}

/** The copy an open editor's writing goes to now, if it has moved; follows the move live. */
export function useMovedTo(id: string, from: number | undefined) {
  const { data } = useQuery<Moved>({ queryKey: movedKey, queryFn: () => ({}), enabled: false })
  return find(data, id, from)
}
