/**
 * Move on a joke in a beat (docs/sets.md, "Drag and arrows"): the same moves as dragging,
 * for when a drag is hard, the other block is far away, or it doesn't exist yet. A gate's joke
 * brings its gate. Tested in moveTo.test.ts.
 */
import type { Beat, SetEntry } from '../../api/types'
import { newJokes, newPremise } from './beatEdit'
import { moveJoke, spotOf } from './beatMove'
import { hasPieces } from './beats'
import { rowsOf } from './gateRows'

/** Into another block of the beat (at its end), on its own in a new No premise block just
 * below its block (`alone`), or under a premise (its block in the beat, else a new one below). */
export type MoveTo = { entryId: string } | { alone: true } | { premiseId: string }

export interface MoveChoice { label: string; to: MoveTo }

/** The Move menu in two parts: where it goes with no premise, and under which premise. */
export interface MoveGroups { none: MoveChoice[]; premise: MoveChoice[] }

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
  if (!canGoAlone(beat, pieceId)) return beat
  return into(beat, at, newJokes(), pieceId)
}

/** A joke can go into a new No premise block unless it's all of the No premise block it's in. */
function canGoAlone(beat: Beat, pieceId: string): boolean {
  const from = spotOf(beat, pieceId)
  const source = beat.entries.find((e) => e.id === from?.entryId)
  if (!from || !source || !hasPieces(source)) return false
  return source.kind !== 'jokes' || from.gateId !== null || rowsOf(source.pieces).length > 1
}

/** A new block just below block `at`, with the joke in it. */
function into(beat: Beat, at: number, entry: SetEntry, pieceId: string): Beat {
  const entries = [...beat.entries.slice(0, at + 1), entry, ...beat.entries.slice(at + 1)]
  return moveJoke({ ...beat, entries }, pieceId, { entryId: entry.id, gateId: null, index: 0 })
}

/** What Move offers a joke. No premise: a new block of its own just below, then the beat's other
 * No premise blocks. A premise: the beat's other premise blocks (Another premise… is the
 * caller's). Blocks go by their number in the beat; `takeOf` names a premise. */
export function moveChoices(beat: Beat, pieceId: string, takeOf: (premiseId: string | null) => string | undefined): MoveGroups {
  const from = spotOf(beat, pieceId)
  const out: MoveGroups = { none: [], premise: [] }
  if (!from) return out
  if (canGoAlone(beat, pieceId)) out.none.push({ label: 'New block, just below', to: { alone: true } })
  beat.entries.forEach((e, i) => {
    if (e.id === from.entryId || !hasPieces(e)) return
    if (e.kind === 'jokes') out.none.push({ label: `Into ${i + 1} · No premise`, to: { entryId: e.id } })
    else out.premise.push({ label: `Into ${i + 1} · ${short(takeOf(e.premise_id) ?? 'Deleted premise')}`, to: { entryId: e.id } })
  })
  return out
}

const short = (s: string) => (s.length > 40 ? `${s.slice(0, 39).trimEnd()}…` : s)
