/**
 * A set as beats (docs/sets.md): reading them, and the checks. Pure functions, tested in
 * beats.test.ts. The checks are deterministic on purpose: each one is a rule from a Craft note,
 * counted from your own labels, never a guess about the jokes.
 */
import type { Beat, SetEntry, SetField, SetFieldOption, SetPiece, Setlist, StatusGroup } from '../../api/types'

/** What you've written for a beat with no label chosen: always there, never a stored option. */
export const NOT_SURE = 'Not sure'
/** Why a status shift happens. Top-up: you take a loss on purpose to earn the next win. */
export const SHIFT_REASONS = ['Top-up', 'Planned turn', 'Clash'] as const

/** A set's beats. A copy cached from before beats reads as one beat, as the server shows it. */
export function beatsOf(s: Pick<Setlist, 'id' | 'beats' | 'items'>): Beat[] {
  if (s.beats) return s.beats
  if (!s.items.length) return []
  const pieces = s.items.map((i) => ({ id: i.joke_id, joke_id: i.joke_id, loose: i.optional, gate: 0 }))
  const seconds = s.items.reduce((sum, i) => sum + (i.optional ? 0 : i.duration_seconds), 0)
  return [{ id: `${s.id}-beat`, cue: 'Set', description: '', seconds, labels: {}, shift_reason: '', entries: [{ kind: 'jokes', id: `${s.id}-jokes`, pieces }] }]
}

export const hasPieces = (e: SetEntry): e is Extract<SetEntry, { pieces: SetPiece[] }> => e.kind !== 'crowd'

/** Every joke in the set in running order, each once. Loose goes to the server as `optional`. */
export function flatItems(beats: Beat[]) {
  const seen = new Set<string>()
  const items: { joke_id: string; duration_seconds: number; optional: boolean }[] = []
  for (const b of beats) for (const e of b.entries) if (hasPieces(e)) for (const p of e.pieces) {
    if (seen.has(p.joke_id)) continue
    seen.add(p.joke_id)
    items.push({ joke_id: p.joke_id, duration_seconds: 0, optional: p.loose })
  }
  return items
}

export const jokeIds = (beats: Beat[]) => new Set(flatItems(beats).map((i) => i.joke_id))
/** The set's length: the beats' own times added up, never the jokes'. */
export const beatTotal = (beats: Beat[]) => beats.reduce((sum, b) => sum + b.seconds, 0)

/** For each joke, the index of the gate guarding it (a gate guards the next N jokes), or null. */
export function guardMap(pieces: SetPiece[]): (number | null)[] {
  const g: (number | null)[] = pieces.map(() => null)
  pieces.forEach((p, i) => { for (let k = 1; k <= p.gate && i + k < pieces.length; k++) g[i + k] = i })
  return g
}

/** Where the stage goes on if gate `i` didn't land: the first joke after it not guarded by it,
 * counting what its guarded gates guard too (as a gate that didn't land would skip them). */
export function skipTarget(pieces: SetPiece[], i: number): number {
  const guards = guardMap(pieces)
  const off = new Set([i])
  let j = i + 1
  while (j < pieces.length && guards[j] !== null && off.has(guards[j]!)) off.add(j++)
  return j
}

export const statusField = (fields: SetField[]) => fields.find((f) => f.role === 'status')
export const personaField = (fields: SetField[]) => fields.find((f) => f.role === 'persona')

/** The option a beat has for a field; null is Not sure (unset, or the option was deleted). */
export function labelOf(beat: Beat, field: SetField): SetFieldOption | null {
  const id = beat.labels[field.id]
  return field.options.find((o) => o.id === id) ?? null
}

/** Win, neutral or loss for the beat's status; null when Not sure or there's no status field. */
export function groupOf(beat: Beat, fields: SetField[]): StatusGroup | null {
  const f = statusField(fields)
  const o = f && labelOf(beat, f)
  return o ? (o.group ?? 'neutral') : null
}

/** A beat whose status group differs from the last labelled beat before it needs a reason for
 * the shift (a Not sure beat between them doesn't hide it, as the status track draws it). */
export function needsWhy(beats: Beat[], i: number, fields: SetField[]): boolean {
  const b = i > 0 ? groupOf(beats[i], fields) : null
  if (!b) return false
  for (let k = i - 1; k >= 0; k--) {
    const a = groupOf(beats[k], fields)
    if (a) return a !== b
  }
  return false
}

export const hasReason = (b: Beat) => SHIFT_REASONS.some((r) => r === b.shift_reason)

/** A stretch of beat time with no humility top-up: how long, and where (start and end time). */
export interface Run { seconds: number; span: [number, number] | null }

export interface Analysis {
  total: number
  /** The longest stretch with no top-up, two ways: `known` counts a Not sure beat as a top-up, so
   * it's only labelled wins and neutrals (certainly too long if over the limit); `possible` counts
   * Not sure as no top-up (certainly fine if under it). Between the two, labels decide. */
  known: Run
  possible: Run
  /** Beats with a status (Not sure left out). */
  statused: number
  flips: Beat[]
  /** Persona options no beat is labelled with, and the beats whose persona is Not sure. */
  missing: string[]
  personaUnsure: Beat[]
  /** Each beat with a label left Not sure, and which fields. */
  unsure: { beat: Beat; name: string; fields: string[] }[]
}

/** The longest run of beat time with no loss. A Not sure beat is a loss (top-up) or not, as asked. */
function longestRun(beats: Beat[], fields: SetField[], unsureTopsUp: boolean): Run {
  let best: Run = { seconds: 0, span: null }
  let run = 0, start = 0, t = 0
  for (const b of beats) {
    const g = groupOf(b, fields)
    if (g === 'loss' || (!g && unsureTopsUp)) run = 0
    else {
      if (run === 0) start = t
      run += b.seconds
      if (run > best.seconds) best = { seconds: run, span: [start, t + b.seconds] }
    }
    t += b.seconds
  }
  return best
}

export const beatName = (b: Beat, i: number) => b.cue || `Beat ${i + 1}`

export function analyse(beats: Beat[], fields: SetField[]): Analysis {
  const sf = statusField(fields)
  const has = sf ? (b: Beat) => !!labelOf(b, sf) : () => false
  const flips = beats.filter((b, i) => needsWhy(beats, i, fields) && !hasReason(b))
  const pf = personaField(fields)
  const missing = pf ? pf.options.filter((o) => !beats.some((b) => b.labels[pf.id] === o.id)).map((o) => o.label) : []
  const personaUnsure = pf ? beats.filter((b) => !labelOf(b, pf)) : []
  const unsure = beats
    .map((beat, i) => ({ beat, name: beatName(beat, i), fields: fields.filter((f) => !labelOf(beat, f)).map((f) => f.name) }))
    .filter((u) => u.fields.length)
  return {
    total: beatTotal(beats),
    known: longestRun(beats, fields, true),
    possible: longestRun(beats, fields, false),
    statused: beats.filter(has).length,
    flips, missing, personaUnsure, unsure,
  }
}

/** "3 beats, 12 jokes" for a set's card. */
export function setSummary(s: Pick<Setlist, 'id' | 'beats' | 'items'>): string {
  const beats = beatsOf(s).length
  const jokes = s.items.length
  return `${beats} ${beats === 1 ? 'beat' : 'beats'}, ${jokes} ${jokes === 1 ? 'joke' : 'jokes'}`
}
