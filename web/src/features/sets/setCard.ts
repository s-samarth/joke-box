/**
 * What a set's card on Sets says about its shape (docs/sets.md): the checks in a word each, the
 * same rules as the builder's SetChecks (checks.ts), from your own labels. Pure, so it's tested on its own.
 */
import type { PremiseStatus } from '../../api/premises'
import type { Beat, SetFields, Setlist } from '../../api/types'
import { applies, setChecks } from './checks'

export type Pill = { kind: 'ok' | 'warn' | 'info'; text: string }

export function cardChecks(beats: Beat[], config: SetFields): Pill[] {
  if (!beats.length) return []
  const { analysis: a, checks } = setChecks(beats, config)
  const out: Pill[] = checks.filter(applies).map((c) => ({ kind: c.state === 'warn' ? 'warn' : 'ok', text: c.pill }))
  // Checks that can't say anything yet fold into one grey pill, so the card stays short.
  const later = checks.filter((c) => c.state === 'later').length
  const label = checks.filter((c) => c.state === 'label').length
  const waiting = later + label
  if (waiting) {
    const noun = `${waiting} ${waiting === 1 ? 'check needs' : 'checks need'}`
    out.push({ kind: 'info', text: later && label ? `${waiting} checks not yet` : `${noun} more ${later ? 'beats' : 'labels'}` })
  }
  // Counted by beat, not by label, so a card stays short.
  const unsure = a.unsure.length
  if (unsure) out.push({ kind: 'info', text: `${unsure} ${unsure === 1 ? 'beat has' : 'beats have'} Not sure` })
  return out
}

/** "Fri 28 Nov" for a show date. */
export const showDay = (date: string): string =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${date}T12:00:00+05:30`))

/** The status chips on Sets. All leaves out Discarded, as premises do; Discarded shows them. */
export const SET_FILTERS = ['All', 'Draft', 'Work in Progress', 'Stage Ready', 'Discarded'] as const
export type SetFilter = (typeof SET_FILTERS)[number]

/** A set still in the one beat it was read as from before beats (cue "Set", the server's id for it). */
export const madeBeforeBeats = (s: Pick<Setlist, 'id' | 'beats' | 'items'>, beats: Beat[]): boolean =>
  beats.length === 1 && beats[0].id === `${s.id}-beat` && beats[0].cue === 'Set'

export const statusOf = (s: Pick<Setlist, 'status'>): PremiseStatus => s.status ?? 'Draft'

export const shows = (s: Pick<Setlist, 'status'>, filter: SetFilter): boolean =>
  filter === 'All' ? statusOf(s) !== 'Discarded' : statusOf(s) === filter
