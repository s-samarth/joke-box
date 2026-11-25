/**
 * What a set's card on Sets says about its shape (docs/sets.md): the checks in a word each, the
 * same rules as the builder's SetChecks, from your own labels. Pure, so it's tested on its own.
 */
import type { PremiseStatus } from '../../api/premises'
import type { Beat, SetFields, Setlist } from '../../api/types'
import { clock } from '../../lib/duration'
import { analyse, labelOf, personaField, statusField } from './beats'

export type Pill = { kind: 'ok' | 'warn' | 'info'; text: string }

export function cardChecks(beats: Beat[], config: SetFields): Pill[] {
  if (!beats.length) return []
  const { fields, top_up_seconds: limit } = config
  const a = analyse(beats, fields)
  const status = statusField(fields)
  const persona = personaField(fields)
  const out: Pill[] = []
  // Checks need labels: until a beat has a status, they'd only ever say "fine".
  const labelled = status ? beats.some((b) => b.labels[status.id]) : false
  if (status && labelled) {
    const n = a.flips.length
    out.push(n ? { kind: 'warn', text: `${n} ${n === 1 ? 'shift' : 'shifts'} with no reason` } : { kind: 'ok', text: 'Every shift has a reason' })
    out.push(a.longest > limit ? { kind: 'warn', text: `${clock(a.longest)} with no top-up` } : { kind: 'ok', text: `Top-up within ${clock(limit)}` })
  }
  if (persona && labelled && a.missing.length) out.push({ kind: 'warn', text: `No ${a.missing.join(', ')} beat` })
  // Counted by beat, not by label, so a card stays short.
  const unsure = beats.filter((b) => fields.some((f) => !labelOf(b, f))).length
  if (unsure) out.push({ kind: 'info', text: labelled ? `${unsure} ${unsure === 1 ? 'beat has' : 'beats have'} Not sure` : 'Label the beats to see the checks' })
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
