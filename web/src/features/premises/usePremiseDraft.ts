/** Edit-in-place for one premise, saved after a short pause or when you leave, like a joke. */
import { useEffect, useRef, useState } from 'react'
import { useSavePremise, type Premise, type PremiseInput } from '../../api/premises'
import { onHide } from '../../lib/saveOnHide'

const DELAY = 700

export function usePremiseDraft(premise: Premise) {
  const [draft, setDraft] = useState<PremiseInput>(() => ({ topic_id: premise.topic_id, take: premise.take, notes: premise.notes, extra_notes: premise.extra_notes ?? '', strength: premise.strength ?? null, status: premise.status ?? 'Draft', version: premise.version,
    // Only when known: a premise cached before these existed leaves them out, so a save keeps them.
    ...(premise.persona !== undefined && { persona: premise.persona }), ...(premise.generic !== undefined && { generic: premise.generic }) }))
  const save = useSavePremise()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<PremiseInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    // A blank take can't be saved; the last good one stays until you write another.
    if (pending.current && pending.current.take.trim()) mutate.current({ id: premise.id, input: pending.current })
    pending.current = null
  }

  const update = (patch: Partial<PremiseInput>) => {
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
    // Only on mount/unmount for this premise; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [premise.id])

  return { draft, update }
}
