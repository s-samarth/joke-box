/**
 * A list of jokes as a tree of rows (docs/sets.md): a joke on its own, or a gate (its joke on top)
 * with the jokes it guards inside, which can hold one gate of their own. The stored shape stays a
 * flat list with `gate: N` on each gate joke, so older sets and older apps read it as before.
 * Pure functions, tested in gateEdit.test.ts.
 */
import type { SetPiece } from '../../api/types'

/** A joke on its own (`guarded` empty), or a gate and the jokes it guards. */
export interface Row { piece: SetPiece; guarded: Row[] }

/** Gates go two deep at most: a gate, and inside it a gate whose jokes can't be gates. */
export const GATE_DEPTH = 2

/**
 * Gates fit their list: a gate guards only jokes after it, and a gate inside a gate ends inside
 * it. One that ran past the end of its outer gate widens the outer one, and a gate deeper than
 * GATE_DEPTH folds into the gate it's in, so every joke that was guarded still is.
 */
export function fitGates(pieces: SetPiece[]): SetPiece[] {
  const end = pieces.map((p, i) => Math.min(i + p.gate, pieces.length - 1))
  for (let i = pieces.length - 1; i >= 0; i--) for (let j = i + 1; j <= end[i]; j++) end[i] = Math.max(end[i], end[j])
  const open: number[] = [] // the ends of the gates around the joke
  return pieces.map((p, i) => {
    while (open.length && open[open.length - 1] < i) open.pop()
    const gate = open.length >= GATE_DEPTH ? 0 : end[i] - i
    if (gate) open.push(end[i])
    return p.gate === gate ? p : { ...p, gate }
  })
}

export function rowsOf(pieces: SetPiece[]): Row[] {
  const fitted = fitGates(pieces)
  const read = (from: number, to: number): Row[] => {
    const rows: Row[] = []
    for (let i = from; i < to; i += fitted[i].gate + 1) rows.push({ piece: fitted[i], guarded: read(i + 1, i + 1 + fitted[i].gate) })
    return rows
  }
  return read(0, fitted.length)
}

const size = (r: Row): number => r.guarded.reduce((n, g) => n + 1 + size(g), 0)

/** Back to the stored list: a gate guards what's inside it, and a gate left empty is a joke. */
export const piecesOf = (rows: Row[]): SetPiece[] =>
  rows.flatMap((r) => [size(r) === r.piece.gate ? r.piece : { ...r.piece, gate: size(r) }, ...piecesOf(r.guarded)])

/** Change the rows inside gate `gateId` (null: the top of the list). */
export function mapList(rows: Row[], gateId: string | null, change: (rows: Row[]) => Row[]): Row[] {
  if (gateId === null) return change(rows)
  return rows.map((r) => (r.piece.id === gateId ? { ...r, guarded: change(r.guarded) } : { ...r, guarded: mapList(r.guarded, gateId, change) }))
}

/** The rows without the joke `id` (and what it guards), and that row. */
export function takeOut(rows: Row[], id: string): [Row[], Row | null] {
  let found: Row | null = null
  const out = rows.flatMap((r) => {
    if (r.piece.id === id) { found = r; return [] }
    if (found) return [r]
    const [guarded, inner] = takeOut(r.guarded, id)
    if (inner) found = inner
    return [inner ? { ...r, guarded } : r]
  })
  return [out, found]
}

/** How many levels of gate a row is: 0 a joke, 1 a gate, 2 a gate with a gate inside. */
export const height = (r: Row): number => (r.guarded.length ? 1 + Math.max(...r.guarded.map(height)) : 0)

/** How many gates a spot is inside. */
export function depthOf(rows: Row[], gateId: string | null): number {
  if (gateId === null) return 0
  const at = find(rows, gateId)
  return at ? 1 + depthOf(rows, at.gateId) : 0
}

export const holds = (r: Row, id: string): boolean => r.piece.id === id || r.guarded.some((g) => holds(g, id))

export function find(rows: Row[], id: string, gateId: string | null = null): { gateId: string | null; index: number } | null {
  for (const [index, r] of rows.entries()) {
    if (r.piece.id === id) return { gateId, index }
    const inner = find(r.guarded, id, r.piece.id)
    if (inner) return inner
  }
  return null
}

export function findRow(rows: Row[], id: string): Row | null {
  for (const r of rows) {
    if (r.piece.id === id) return r
    const inner = findRow(r.guarded, id)
    if (inner) return inner
  }
  return null
}
