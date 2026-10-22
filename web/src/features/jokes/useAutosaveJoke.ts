/**
 * Edit-in-place for one joke. Changes apply to a local copy immediately and are saved after a
 * short pause (or when you leave), through the same offline-safe save as capture.
 */
import { useEffect, useRef, useState } from 'react'
import { useSaveJoke } from '../../api/library'
import type { Joke, JokeInput } from '../../api/types'

const DELAY = 700

function toInput(b: Joke): JokeInput {
  const { id: _id, created_at: _c, updated_at: _u, ...input } = b
  return input
}

export function useAutosaveJoke(joke: Joke) {
  const [draft, setDraft] = useState<JokeInput>(() => toInput(joke))
  const save = useSaveJoke()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<JokeInput | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current && pending.current.setup.trim()) mutate.current({ id: joke.id, input: pending.current })
    pending.current = null
  }

  const update = (patch: Partial<JokeInput>) => {
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
    // Only on mount/unmount for this joke; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [joke.id])

  return { draft, update, flush }
}
