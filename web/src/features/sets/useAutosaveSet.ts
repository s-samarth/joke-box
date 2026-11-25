/** A set being edited: local state that saves itself shortly after each change. Beat times are
 * set by hand, so nothing here follows the jokes' own runtimes. */
import { useEffect, useRef, useState } from 'react'
import { type SetlistInput, useSetlistActions } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { onHide } from '../../lib/saveOnHide'
import { flatItems } from './beats'
import { setlistInput } from './setlistInput'

export function useAutosaveSet(setlist: Setlist) {
  const [draft, setDraft] = useState<SetlistInput>(() => setlistInput(setlist))
  const { save } = useSetlistActions()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<SetlistInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    // The flat list of jokes always follows the beats (what a joke's "In sets" reads).
    const next = pending.current
    if (next) mutate.current({ id: setlist.id, input: { ...next, items: flatItems(next.beats), name: next.name.trim() || 'Untitled set' } })
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
    const stop = onHide(flush)
    return () => {
      stop()
      flush()
    }
    // Only on mount/unmount for this set; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [setlist.id])

  return { draft, update }
}
