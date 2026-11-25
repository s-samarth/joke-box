/**
 * A joke under a premise in a set rests on that premise in your library (docs/sets.md). Adding
 * jokes to a premise, putting loose jokes under one, or dragging jokes into one saves the premise
 * on each joke. A joke rests on one premise at a time, so one on another premise moves, and says
 * so first. Each change hands back how to put the jokes back, for Undo.
 */
import { useEffect, useRef } from 'react'
import { useJokes, useSaveJoke } from '../../api/library'
import { usePremises } from '../../api/premises'
import type { Joke } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { toInput } from '../jokes/useAutosaveJoke'

export const short = (take: string, most = 60) => (take.length > most ? `${take.slice(0, most - 1).trimEnd()}…` : take)
export const many = (n: number) => (n === 1 ? '1 joke' : `${n} jokes`)

export function usePremiseLink() {
  const { data: jokes = [] } = useJokes()
  const { data: premises = [] } = usePremises()
  const save = useSaveJoke()
  const { confirm } = useFeedback()
  const latest = useRef(jokes) // Undo saves each joke from its version by then
  useEffect(() => { latest.current = jokes })
  const takeOf = (id: string | null | undefined) => premises.find((p) => p.id === id)?.take

  /** Rest these jokes on the premise; returns how to put them back. */
  const attach = (list: Joke[], to: string) => {
    const was = list.filter((j) => j.premise_id !== to).map((j) => [j.id, j.premise_id ?? null] as const)
    for (const [id] of was) { const j = latest.current.find((x) => x.id === id); if (j) save.mutate({ id, input: { ...toInput(j), premise_id: to } }) }
    return () => { for (const [id, premise] of was) { const j = latest.current.find((x) => x.id === id); if (j) save.mutate({ id, input: { ...toInput(j), premise_id: premise } }) } }
  }

  /** True to go ahead: none of them rests on another premise, or you said they move. */
  const askToMove = async (list: Joke[], to: string) => {
    const moving = list.filter((j) => j.premise_id && j.premise_id !== to)
    if (!moving.length) return true
    const message = moving.length === 1 ? `“${short(moving[0].setup)}” rests on “${short(takeOf(moving[0].premise_id) ?? 'another premise')}”.` : `${moving.length} of them rest on other premises.`
    return confirm({ title: `Move ${moving.length === 1 ? 'it' : 'them'} to this premise?`, message: `${message} A joke rests on one premise at a time, so ${moving.length === 1 ? 'it moves' : 'they move'} here.`, confirmLabel: 'Move' })
  }

  return { attach, askToMove, takeOf }
}
