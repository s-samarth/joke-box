/**
 * Making and filling gates, and the arrows (docs/sets.md). The arrows walk a joke one place at a
 * time through what you can see, so they go into and out of gates on the way, within its list.
 * Tested in gateEdit.test.ts.
 */
import type { SetPiece } from '../../api/types'
import { GATE_DEPTH, depthOf, find, findRow, height, mapList, piecesOf, rowsOf, takeOut, type Row } from './gateRows'

/** Whether the joke can be made a gate here: there's a joke under it, and the two levels of gate
 * aren't used up. */
export function canGate(pieces: SetPiece[], pieceId: string): boolean {
  const rows = rowsOf(pieces)
  const at = find(rows, pieceId)
  if (!at) return false
  const next = at.gateId === null ? rows[at.index + 1] : findRow(rows, at.gateId)?.guarded[at.index + 1]
  return !!next && depthOf(rows, at.gateId) + 1 + height(next) <= GATE_DEPTH
}

/** Gate on: the joke takes in the one under it (with its gate, if it has one). Gate off: what it
 * guarded stays where it is, one level up. */
export function toggleGate(pieces: SetPiece[], pieceId: string): SetPiece[] {
  const rows = rowsOf(pieces)
  const at = find(rows, pieceId)
  if (!at) return pieces
  if (!findRow(rows, pieceId)?.guarded.length && !canGate(pieces, pieceId)) return pieces
  return piecesOf(mapList(rows, at.gateId, (list) => {
    const r = list[at.index]
    if (r.guarded.length) return [...list.slice(0, at.index), { piece: r.piece, guarded: [] }, ...r.guarded, ...list.slice(at.index + 1)]
    const next = list[at.index + 1]
    return next ? [...list.slice(0, at.index), { piece: r.piece, guarded: [next] }, ...list.slice(at.index + 2)] : list
  }))
}

/** Jokes added straight into a gate go at its end. */
export const addToGate = (pieces: SetPiece[], gateId: string, adding: SetPiece[]) =>
  piecesOf(mapList(rowsOf(pieces), gateId, (list) => [...list, ...adding.map((piece) => ({ piece, guarded: [] }))]))


const insert = (list: Row[], at: number, row: Row) => [...list.slice(0, at), row, ...list.slice(at)]

/**
 * One arrow press: the joke (a gate, with all it holds) goes one place up (d = -1) or down
 * (d = 1). Next to a gate it goes into it if the two levels allow, at the end going up and at the
 * top going down, else past it. At the edge of a gate it comes out of it. At the edge of the
 * list: unchanged.
 */
export function stepJoke(pieces: SetPiece[], pieceId: string, d: -1 | 1): SetPiece[] {
  const rows = rowsOf(pieces)
  const at = find(rows, pieceId)
  const row = findRow(rows, pieceId)
  if (!at || !row) return pieces
  const list = at.gateId === null ? rows : (findRow(rows, at.gateId)?.guarded ?? [])
  const k = at.index + d
  const [rest] = takeOut(rows, pieceId)
  if (k < 0 || k >= list.length) {
    const gate = at.gateId === null ? null : find(rows, at.gateId)
    if (!gate) return pieces
    return piecesOf(mapList(rest, gate.gateId, (l) => insert(l, gate.index + (d > 0 ? 1 : 0), row)))
  }
  const next = list[k]
  if (next.guarded.length && depthOf(rows, at.gateId) + 1 + height(row) <= GATE_DEPTH)
    return piecesOf(mapList(rest, next.piece.id, (l) => (d < 0 ? [...l, row] : [row, ...l])))
  return piecesOf(mapList(rest, at.gateId, (l) => insert(l, k, row)))
}

export const canStep = (pieces: SetPiece[], pieceId: string, d: -1 | 1) => stepJoke(pieces, pieceId, d) !== pieces
