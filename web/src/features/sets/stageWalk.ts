/**
 * On stage, one beat at a time: what's left to do in the beat, given the gates answered so far.
 * A gate is asked when you reach it. If it didn't land, what it guards is struck out; a gate
 * that is itself struck out is never asked, and what it guards goes too. So is a premise gate whose
 * premise before was struck out: that premise never ran. Tested in stageWalk.test.ts.
 */
import type { Beat, SetEntry, SetPiece } from '../../api/types'
import { guardMap, hasPieces } from './beats'

export type Answers = Record<string, boolean>

export type Row =
  | { kind: 'premise'; key: string; entry: Extract<SetEntry, { kind: 'premise' }>; gated: boolean; skipped: boolean }
  | { kind: 'piece'; key: string; piece: SetPiece; guarded: boolean; skipped: boolean }
  | { kind: 'crowd'; key: string; entry: Extract<SetEntry, { kind: 'crowd' }> }

/** The next gate to answer: a premise (did the one before land?) or a joke (did it land?). */
export type Pending = { key: string; premise: boolean; jokeId?: string } | null

export const premiseKey = (beat: Beat, entry: SetEntry) => `${beat.id}/${entry.id}`
export const pieceKey = (beat: Beat, entry: SetEntry, piece: SetPiece) => `${beat.id}/${entry.id}/${piece.id}`

export function walk(beat: Beat, answers: Answers): { rows: Row[]; pending: Pending } {
  const rows: Row[] = []
  let pending: Pending = null
  let lastPremiseOff = false // a premise gate asks about the premise before: struck out, it never ran
  for (const entry of beat.entries) {
    if (!hasPieces(entry)) {
      rows.push({ kind: 'crowd', key: entry.id, entry })
      continue
    }
    let premiseSkipped = false
    if (entry.kind === 'premise') {
      const key = premiseKey(beat, entry)
      premiseSkipped = entry.gate && (lastPremiseOff || answers[key] === false)
      if (entry.gate && !premiseSkipped && answers[key] === undefined && !pending) pending = { key, premise: true }
      lastPremiseOff = premiseSkipped
      rows.push({ kind: 'premise', key, entry, gated: entry.gate, skipped: premiseSkipped })
    }
    const guards = guardMap(entry.pieces)
    const skipped: boolean[] = []
    entry.pieces.forEach((piece, i) => {
      const g = guards[i]
      const key = pieceKey(beat, entry, piece)
      // Guarded by a gate that didn't land, or that was struck out itself and so never asked.
      const off = premiseSkipped || (g !== null && (skipped[g] || answers[pieceKey(beat, entry, entry.pieces[g])] === false))
      skipped.push(off)
      if (piece.gate && !off && answers[key] === undefined && !pending) pending = { key, premise: false, jokeId: piece.joke_id }
      rows.push({ kind: 'piece', key, piece, guarded: g !== null, skipped: off })
    })
  }
  return { rows, pending }
}

/** Where on the clock each beat starts, from the beats' own times. */
export const starts = (beats: Beat[]) => beats.map((_, i) => beats.slice(0, i).reduce((sum, b) => sum + b.seconds, 0))
