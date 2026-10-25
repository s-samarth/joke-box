/** A set being edited: local state that saves itself shortly after each change. */
import { useEffect, useRef, useState } from 'react'
import { type SetlistInput, useSetlistActions } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { setlistInput } from './setlistInput'

export function useAutosaveSet(setlist: Setlist) {
  const [draft, setDraft] = useState<SetlistInput>(() => setlistInput(setlist))
  const { save } = useSetlistActions()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<SetlistInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  // A joke's runtime changed (on its page, or here in the set): take in the set's new times, unless
  // an edit here is still waiting to save. Only the jokes, so a set name mid-typing is left alone.
  const items = JSON.stringify(setlist.items.map((i) => [i.joke_id, i.duration_seconds]))
  useEffect(() => {
    const times = new Map(JSON.parse(items) as [string, number][])
    if (!pending.current) setDraft((d) => ({ ...d, items: d.items.map((i) => ({ ...i, duration_seconds: times.get(i.joke_id) ?? i.duration_seconds })) }))
  }, [items])

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current) mutate.current({ id: setlist.id, input: { ...pending.current, name: pending.current.name.trim() || 'Untitled set' } })
    pending.current = null
  }

  const update = (change: (d: SetlistInput) => SetlistInput) => {
    setDraft((d) => {
      const next = change(d)
      pending.current = next
      return next
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // Only on mount/unmount for this set; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [setlist.id])

  return { draft, update }
}
