/** Edit-in-place for one observation, saved after a short pause or when you leave, like a premise. */
import { useEffect, useRef, useState } from 'react'
import { useSaveObservation } from '../../api/notebook'
import type { Observation, ObservationInput } from '../../api/types'
import { onHide } from '../../lib/saveOnHide'

const DELAY = 700

export function useObservationDraft(observation: Observation) {
  const [draft, setDraft] = useState<ObservationInput>(() => ({
    text: observation.text, topic_id: observation.topic_id, kind_id: observation.kind_id, version: observation.version,
  }))
  const save = useSaveObservation()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<ObservationInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    // Blank words can't be saved; the last good ones stay until you write more.
    if (pending.current && pending.current.text.trim()) mutate.current({ id: observation.id, input: { ...pending.current, text: pending.current.text.trim() } })
    pending.current = null
  }

  const update = (patch: Partial<ObservationInput>) => {
    setDraft((d) => {
      const next = { ...d, ...patch }
      pending.current = next
      return next
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, DELAY)
  }

  useEffect(() => {
    const stop = onHide(flush)
    return () => {
      stop()
      flush()
    }
    // Only on mount/unmount for this observation; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [observation.id])

  return { draft, update }
}
