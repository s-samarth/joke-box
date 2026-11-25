/**
 * The set's checks (docs/sets.md "The checks"), worked out once for the builder (SetChecks) and
 * the set's card (setCard). Each is a rule from a Craft note, counted from your own labels. A
 * check also knows when it can't say anything yet, and says what it needs instead of ticking:
 * - `later`: the set is too short for the rule to bite (one beat can't shift, a 2:00 set can't go
 *   4:00 without a top-up, two beats can't hold three persona sides). Add beats.
 * - `label`: the answer depends on beats left Not sure. Not sure is never guessed either way.
 * None of these thresholds is a number picked here: each follows from the rule itself.
 */
import type { Beat, SetField, SetFields } from '../../api/types'
import { clock } from '../../lib/duration'
import { type Analysis, analyse, beatName, groupOf, personaField, statusField } from './beats'

export type CheckState = 'ok' | 'warn' | 'later' | 'label'
export interface Check {
  id: 'shift' | 'topup' | 'persona'
  state: CheckState
  /** The builder's heading. */
  title: string
  /** What it needs before it applies (later, label), in a line. */
  need: string
  /** The card's pill, for ok and warn. */
  pill: string
}

const names = (beats: Beat[], all: Beat[]) => beats.map((b) => beatName(b, all.indexOf(b))).join(', ')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function shift(beats: Beat[], a: Analysis): Check {
  const id = 'shift', title = 'Every status shift has a reason'
  if (a.statused < 2) {
    const more = beats.length < 2
    return { id, title, state: more ? 'later' : 'label', pill: '', need: more ? 'Applies once there are two beats. One beat can’t shift.' : 'Applies once two beats have a status.' }
  }
  if (a.flips.length) {
    const n = a.flips.length
    return { id, state: 'warn', title: `Shift with no reason: ${names(a.flips, beats)}`, need: '', pill: `${plural(n, 'shift')} with no reason` }
  }
  return { id, title, state: 'ok', need: '', pill: 'Every shift has a reason' }
}

function topUp(beats: Beat[], a: Analysis, limit: number, fields: SetField[]): Check {
  const id = 'topup', title = `A humility top-up at least every ${clock(limit)}`
  if (a.total <= limit) return { id, title, state: 'later', pill: '', need: `Applies once the beats add up to more than ${clock(limit)}. The set is ${clock(a.total)}.` }
  if (a.known.seconds > limit) return { id, state: 'warn', title: `${clock(a.known.seconds)} with no humility top-up`, need: '', pill: `${clock(a.known.seconds)} with no top-up` }
  if (a.possible.seconds <= limit) return { id, title, state: 'ok', need: '', pill: `Top-up within ${clock(limit)}` }
  // Too long if the Not sure beats in the longest possible stretch aren't top-ups: label them.
  const [s, e] = a.possible.span ?? [0, 0]
  let t = 0
  const open = beats.filter((b) => { const inside = t >= s && t + b.seconds <= e; t += b.seconds; return inside && !groupOf(b, fields) })
  return { id, title, state: 'label', pill: '', need: `Give ${names(open, beats)} a status to check this.` }
}

function persona(beats: Beat[], a: Analysis, sides: number): Check {
  const id = 'persona', title = 'Every persona side drives a beat'
  if (beats.length < sides) return { id, title, state: 'later', pill: '', need: `Applies once there are ${sides} beats, one per side. The set has ${plural(beats.length, 'beat')}.` }
  if (!a.missing.length) return { id, title, state: 'ok', need: '', pill: 'Every persona side' }
  if (a.personaUnsure.length >= a.missing.length) {
    return { id, title, state: 'label', pill: '', need: `${a.missing.join(', ')} could still be on ${names(a.personaUnsure, beats)}. Label ${a.personaUnsure.length === 1 ? 'it' : 'them'} to check this.` }
  }
  return { id, state: 'warn', title: `${a.missing.join(', ')} never ${a.missing.length === 1 ? 'drives' : 'drive'} a beat`, need: '', pill: `No ${a.missing.join(', ')} beat` }
}

/** The checks your fields make possible, in the order they're shown, and the analysis behind them. */
export function setChecks(beats: Beat[], config: SetFields): { analysis: Analysis; checks: Check[] } {
  const { fields, top_up_seconds: limit } = config
  const analysis = analyse(beats, fields)
  const checks: Check[] = []
  if (statusField(fields)) checks.push(shift(beats, analysis), topUp(beats, analysis, limit, fields))
  const pf = personaField(fields)
  if (pf && pf.options.length) checks.push(persona(beats, analysis, pf.options.length))
  return { analysis, checks }
}

export const applies = (c: Check) => c.state === 'ok' || c.state === 'warn'
