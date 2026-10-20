/**
 * Edit-in-place for one bit. Changes apply to a local copy immediately and are saved after a
 * short pause (or when you leave), through the same offline-safe save as capture.
 */
import { useEffect, useRef, useState } from 'react'
import { useSaveBit } from '../../api/library'
import type { Bit, BitInput } from '../../api/types'

const DELAY = 700

function toInput(b: Bit): BitInput {
  const { id: _id, created_at: _c, updated_at: _u, ...input } = b
  return input
}

export function useAutosaveBit(bit: Bit) {
  const [draft, setDraft] = useState<BitInput>(() => toInput(bit))
  const save = useSaveBit()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<BitInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current && pending.current.setup.trim()) mutate.current({ id: bit.id, input: pending.current })
    pending.current = null
  }

  const update = (patch: Partial<BitInput>) => {
    setDraft((d) => {
      const next = { ...d, ...patch }
      pending.current = next
      return next
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, DELAY)
  }

  // Save anything still waiting when you navigate away or close the tab.
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // Only on mount/unmount for this bit; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [bit.id])

  return { draft, update, flush }
}
