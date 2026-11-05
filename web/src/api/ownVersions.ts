/**
 * Edits on two devices: each save of a joke, set or brainstorm session sends the version it was
 * edited from (`base_version`), and the server refuses one made from a version that moved on
 * elsewhere. This device's own saves mustn't clash with each other, though: autosaves made
 * from the version the editor opened go out based on the newest version this device saved.
 *
 * Per thing, the versions this device's own chain of saves covers, from `from` to `to`. Kept in
 * the cache (saved on the phone with the waiting saves), so it holds across a relaunch.
 */
import { queryClient } from './queryClient'

type Own = Record<string, { from: number; to: number }>

export interface OwnVersions {
  /** The version to send as the base of an edit made from version `from`. */
  baseFor(id: string, from: number | undefined): number | undefined
  /** The newest version this device saved, if any. */
  latest(id: string): number | undefined
  /** A save edited from `from`, sent based on `base`, came back as `version`. */
  record(id: string, from: number | undefined, base: number | undefined, version: number): void
}

/** `name` is the cache key, so it must never change: jokes have used 'joke-own-versions'. */
export function ownVersions(name: string): OwnVersions {
  const key = [name]
  queryClient.setQueryDefaults(key, { gcTime: Infinity })
  const own = (id: string) => queryClient.getQueryData<Own>(key)?.[id]
  return {
    baseFor(id, from) {
      const mine = own(id)
      const base = mine && from !== undefined && from >= mine.from && from <= mine.to ? mine.to : from
      return base || undefined // 0: not created yet when the edit began
    },
    latest: (id) => own(id)?.to,
    record(id, from, base, version) {
      queryClient.setQueryData<Own>(key, (all = {}) => {
        const mine = all[id]
        const chained = mine && base !== undefined && base === mine.to
        return { ...all, [id]: { from: chained ? mine.from : (from ?? 0), to: version } }
      })
    },
  }
}
