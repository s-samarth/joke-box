/**
 * Edit-in-place for one joke. Changes apply to a local copy immediately and are saved after a
 * short pause (or when you leave), through the same offline-safe save as capture.
 */
import { useEffect, useRef, useState } from 'react'
import { useSaveJoke } from '../../api/library'
import type { Joke, JokeInput } from '../../api/types'
import { onHide } from '../../lib/saveOnHide'

const DELAY = 700

/** A joke as the editor sends it back. */
export function toInput(b: Joke): JokeInput {
  const { id: _id, created_at: _c, updated_at: _u, ...input } = b
  return input
}

const filled = (lines: string[]) => lines.filter((l) => l.trim())

/**
 * The draft as it's sent: rows left empty (a tag line or alternate punch just added) stay on
 * screen but aren't saved. The server drops them anyway, and the copy it then sent back used to
 * take the empty row away while you were still thinking.
 */
export function toSend(draft: JokeInput): JokeInput {
  const sent = { ...draft, tag_lines: filled(draft.tag_lines) }
  if (draft.alt_punchlines) sent.alt_punchlines = filled(draft.alt_punchlines)
  return sent
}

/** The same words and settings, whatever version each came from. */
function sameFields(a: JokeInput, b: JokeInput): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  keys.delete('version')
  return [...keys].every((k) => JSON.stringify(a[k as keyof JokeInput]) === JSON.stringify(b[k as keyof JokeInput]))
}

/**
 * The draft once a newer copy of the joke arrives: that copy, if nothing's been typed since the
 * last one was shown (`typing`: a change still waiting to be sent); otherwise the draft as it is.
 */
export function followNewer(draft: JokeInput, shown: JokeInput, newer: JokeInput, typing: boolean): JokeInput {
  return !typing && sameFields(draft, shown) ? newer : draft
}

export function useAutosaveJoke(joke: Joke) {
  const [draft, setDraft] = useState<JokeInput>(() => toInput(joke))
  const save = useSaveJoke()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<JokeInput | null>(null)
  // The joke as last shown. A newer copy (a waiting save shown, a refresh, another device's edit)
  // replaces the draft while nothing's been typed since: an editor left on older text would
  // otherwise save it back over the newer one.
  const shown = useRef(joke)
  useEffect(() => {
    if (joke === shown.current) return
    const before = toInput(shown.current)
    shown.current = joke
    setDraft((d) => followNewer(d, before, toInput(joke), pending.current !== null))
  }, [joke])
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current && pending.current.setup.trim()) mutate.current({ id: joke.id, input: toSend(pending.current) })
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

  // Save anything still waiting when you navigate away, close the tab or switch apps.
  useEffect(() => {
    const stop = onHide(flush)
    return () => {
      stop()
      flush()
    }
    // Only on mount/unmount for this joke; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [joke.id])

  return { draft, update, flush }
}
