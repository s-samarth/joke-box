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
 * counting what its guarded gates guard too (as stageWalk strikes them). */
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

export interface Analysis {
  total: number
  /** The longest run of beat time with no loss (no humility top-up), and where it is. */
  longest: number
  worst: [number, number] | null
  flips: Beat[]
  /** Persona options no beat is labelled with. */
  missing: string[]
  /** "Cue: Field" for each label left Not sure. */
  unsure: string[]
}

export function analyse(beats: Beat[], fields: SetField[]): Analysis {
  let longest = 0, run = 0, runStart = 0, t = 0
  let worst: [number, number] | null = null
  beats.forEach((b) => {
    const g = groupOf(b, fields)
    // A loss is a top-up and ends the run; win and neutral add to it, and so does Not sure once a
    // run has started (no top-up came), so the longest run is the stretch of clock it shades.
    if (g === 'loss') run = 0
    else if (g || run > 0) {
      if (run === 0) runStart = t
      run += b.seconds
      if (run > longest) { longest = run; worst = [runStart, t + b.seconds] }
    }
    t += b.seconds
  })
  const flips = beats.filter((b, i) => needsWhy(beats, i, fields) && !hasReason(b))
  const pf = personaField(fields)
  const missing = pf ? pf.options.filter((o) => !beats.some((b) => b.labels[pf.id] === o.id)).map((o) => o.label) : []
  const unsure = beats.flatMap((b, i) => fields.filter((f) => !labelOf(b, f)).map((f) => `${b.cue || `Beat ${i + 1}`}: ${f.name}`))
  return { total: t, longest, worst, flips, missing, unsure }
}

/** "3 beats, 12 jokes" for a set's card. */
export function setSummary(s: Pick<Setlist, 'id' | 'beats' | 'items'>): string {
  const beats = beatsOf(s).length
  const jokes = s.items.length
  return `${beats} ${beats === 1 ? 'beat' : 'beats'}, ${jokes} ${jokes === 1 ? 'joke' : 'jokes'}`
}
