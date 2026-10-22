/**
 * Saves a brainstorm session a moment after you stop typing or drawing, and once more when
 * you leave the page. Nothing is saved until the session has something in it.
 *
 * Pattern: a ref (`latest`) always holds the newest values, so the timeout and the unmount
 * cleanup save what's on screen now, not what was there when they were scheduled.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useSaveSession } from '../../api/sessions'
import type { WritingSessionInput } from '../../api/types'

const DELAY_MS = 1200

const isEmpty = (s: WritingSessionInput) =>
  !s.title.trim() && !s.content.trim() && !s.ink.length && !s.joke_ids.length && !s.observation_ids.length

export function useSessionAutosave(id: string, input: WritingSessionInput) {
  const save = useSaveSession()
  const latest = useRef(input)
  const dirty = useRef(false)
  const mutate = useRef(save.mutate)
  useLayoutEffect(() => {
    latest.current = input
    mutate.current = save.mutate
  })

  const flush = useCallback(() => {
    if (!dirty.current || isEmpty(latest.current)) return
    dirty.current = false
    mutate.current({ id, input: latest.current })
  }, [id])

  // Everything except the ticking timer schedules a save; the timer is saved along with them.
  const { title, content, ink, ink_pages, joke_ids, observation_ids, technique_id } = input
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(flush, DELAY_MS)
    return () => clearTimeout(t)
  }, [title, content, ink, ink_pages, joke_ids, observation_ids, technique_id, flush])

  useEffect(() => flush, [flush])

  return {
    /** Call on every edit so the next pause saves it. */
    touch: () => { dirty.current = true },
    /** Save right now (e.g. when the timer is paused). */
    saveNow: () => { dirty.current = true; flush() },
    saving: save.isPending,
  }
}
