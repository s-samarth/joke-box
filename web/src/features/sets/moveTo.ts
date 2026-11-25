/**
 * "Move to…" on a joke in a beat (docs/sets.md, "Drag and arrows"): the same moves as dragging,
 * for when a drag is hard, the other block is far away, or it doesn't exist yet. A gate's joke
 * brings its gate. Tested in moveTo.test.ts.
 */
import type { Beat, SetEntry } from '../../api/types'
import { newJokes, newPremise } from './beatEdit'
import { moveJoke, spotOf } from './beatMove'
import { hasPieces } from './beats'
import { rowsOf } from './gateRows'

/** Into another block of the beat (at its end), out of its premise (into No premise just below
 * it), or under a premise (its block in the beat, else a new one just below). */
export type MoveTo = { entryId: string } | { out: true } | { premiseId: string }

export interface MoveChoice { label: string; to: MoveTo }

export function moveTo(beat: Beat, pieceId: string, to: MoveTo): Beat {
  const next = place(beat, pieceId, to)
  return next === beat ? beat : dropEmptied(beat, next)
}

/** A No premise block that a move left empty goes: it held only those jokes. A premise stays. */
export function dropEmptied(before: Beat, after: Beat): Beat {
  const had = new Set(before.entries.filter((e) => e.kind === 'jokes' && e.pieces.length).map((e) => e.id))
  const entries = after.entries.filter((e) => !(e.kind === 'jokes' && !e.pieces.length && had.has(e.id)))
  return entries.length === after.entries.length ? after : { ...after, entries }
}

function place(beat: Beat, pieceId: string, to: MoveTo): Beat {
  const from = spotOf(beat, pieceId)
  if (!from) return beat
  const at = beat.entries.findIndex((e) => e.id === from.entryId)
  if ('entryId' in to) {
    const there = beat.entries.find((e) => e.id === to.entryId)
    if (to.entryId === from.entryId || !there || !hasPieces(there)) return beat
    return moveJoke(beat, pieceId, { entryId: there.id, gateId: null, index: rowsOf(there.pieces).length })
  }
  if ('premiseId' in to) {
    const there = beat.entries.find((e) => e.kind === 'premise' && e.premise_id === to.premiseId)
    return there ? place(beat, pieceId, { entryId: there.id }) : into(beat, at, newPremise(to.premiseId), pieceId)
  }
  if (beat.entries[at].kind !== 'premise') return beat
  const next = beat.entries[at + 1]
  if (next?.kind === 'jokes') return moveJoke(beat, pieceId, { entryId: next.id, gateId: null, index: 0 })
  return into(beat, at, newJokes(), pieceId)
}

/** A new block just below block `at`, with the joke in it. */
function into(beat: Beat, at: number, entry: SetEntry, pieceId: string): Beat {
  const entries = [...beat.entries.slice(0, at + 1), entry, ...beat.entries.slice(at + 1)]
  return moveJoke({ ...beat, entries }, pieceId, { entryId: entry.id, gateId: null, index: 0 })
}

/** What "Move to…" offers a joke: out of its premise, then every other block that holds jokes,
 * by its number in the beat. `takeOf` names a premise. */
export function moveChoices(beat: Beat, pieceId: string, takeOf: (premiseId: string | null) => string | undefined): MoveChoice[] {
  const from = spotOf(beat, pieceId)
  if (!from) return []
  const source = beat.entries.find((e) => e.id === from.entryId)
  const out: MoveChoice[] = source?.kind === 'premise' ? [{ label: 'Out of the premise', to: { out: true } }] : []
  beat.entries.forEach((e, i) => {
    if (e.id === from.entryId || !hasPieces(e)) return
    const name = e.kind === 'premise' ? short(takeOf(e.premise_id) ?? 'Deleted premise') : 'No premise'
    out.push({ label: `Into ${i + 1} · ${name}`, to: { entryId: e.id } })
  })
  return out
}

const short = (s: string) => (s.length > 40 ? `${s.slice(0, 39).trimEnd()}…` : s)
