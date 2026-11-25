/**
 * Moving things around a beat by dragging (docs/sets.md): jokes (a gate's joke brings its gate)
 * between lists and gates, and blocks within the beat. Tested in beatMove.test.ts.
 */
import type { Beat, SetEntry } from '../../api/types'
import { hasPieces } from './beats'
import { GATE_DEPTH, depthOf, find, holds, height, mapList, piecesOf, rowsOf, takeOut } from './gateRows'

/** Where a joke goes: a list, the gate in it whose jokes it joins (null: the list itself), and
 * its place among them. */
export interface Spot { entryId: string; gateId: string | null; index: number }


const lists = (beat: Beat) => beat.entries.filter(hasPieces)

/** Where a joke is now. */
export function spotOf(beat: Beat, pieceId: string): Spot | null {
  for (const e of lists(beat)) {
    const at = find(rowsOf(e.pieces), pieceId)
    if (at) return { entryId: e.id, ...at }
  }
  return null
}

/** The list a joke is in, as a key: its gate's id, else its list's. */
export const placeOf = (s: Pick<Spot, 'entryId' | 'gateId'>) => s.gateId ?? s.entryId


/**
 * Move a joke to `to`; a gate's joke brings everything inside its gate. `to.index` is the place
 * once the joke has left where it was (as an array move counts it). Into its own gate: unchanged.
 */
export function moveJoke(beat: Beat, pieceId: string, to: Spot): Beat {
  const from = spotOf(beat, pieceId)
  const source = lists(beat).find((e) => e.id === from?.entryId)
  if (!from || !source) return beat
  const [rest, row] = takeOut(rowsOf(source.pieces), pieceId)
  if (!row || (to.gateId && holds(row, to.gateId))) return beat
  const target = to.entryId === source.id ? rest : rowsOf(lists(beat).find((e) => e.id === to.entryId)?.pieces ?? [])
  if (to.entryId !== source.id && !lists(beat).some((e) => e.id === to.entryId)) return beat
  if (to.gateId && !find(target, to.gateId)) return beat
  if (depthOf(target, to.gateId) + height(row) > GATE_DEPTH) return beat
  const placed = mapList(target, to.gateId, (list) => [...list.slice(0, to.index), row, ...list.slice(to.index)])
  const entries = beat.entries.map((e) => {
    if (!hasPieces(e)) return e
    if (e.id === to.entryId) return { ...e, pieces: piecesOf(placed) }
    return e.id === source.id ? { ...e, pieces: piecesOf(rest) } : e
  })
  return { ...beat, entries }
}

/** Move a block (a premise, jokes with no premise, crowd work) to place `index` in the beat. */
export function moveEntry(entries: SetEntry[], id: string, index: number): SetEntry[] {
  const from = entries.findIndex((e) => e.id === id)
  if (from < 0 || index < 0 || index >= entries.length) return entries
  const out = entries.filter((e) => e.id !== id)
  out.splice(index, 0, entries[from])
  return out
}

/** Jokes that changed list in a move, with the list they went to. */
export function movedLists(before: Beat, after: Beat): Map<string, string> {
  const was = new Map(lists(before).flatMap((e) => e.pieces.map((p) => [p.id, e.id] as const)))
  return new Map(lists(after).flatMap((e) => e.pieces.filter((p) => was.has(p.id) && was.get(p.id) !== e.id).map((p) => [p.id, e.id] as const)))
}
