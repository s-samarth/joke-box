/**
 * Dragging inside an open beat (docs/sets.md, "Drag and arrows"): blocks among blocks, and jokes
 * among jokes, into and out of gates, and into other blocks of the beat. One drag context for the
 * whole beat, so a joke can cross blocks.
 *
 * dnd-kit does the dragging. Every row says what it is in `data` (a block, a joke, the end of a
 * list, the inside of a gate). While a joke is held over another list or gate it moves there in
 * a preview, so the gap opens where it will land; on drop the preview is handed back, and on Esc
 * it's dropped. A drop the gate levels don't allow is never offered: those targets are left out.
 */
import {
  KeyboardSensor, MeasuringStrategy, PointerSensor, TouchSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent, type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import type { Beat } from '../../api/types'
import { moveEntry, moveJoke, placeOf, spotOf, type Spot } from './beatMove'
import { GATE_DEPTH, findRow, rowsOf } from './gateRows'
import { hasPieces } from './beats'

/** What a drag handle or drop area is. `depth`: how many gates the joke or area is inside. */
export type DragData =
  | { kind: 'entry'; entryId: string }
  | { kind: 'joke'; entryId: string; pieceId: string; gateId: string | null; depth: number; height: number; inside: string[] }
  | { kind: 'list'; entryId: string }
  | { kind: 'gate'; entryId: string; gateId: string; depth: number; inside: string[] }

export const entryKey = (id: string) => `e:${id}`
export const jokeKey = (id: string) => `j:${id}`
export const listKey = (id: string) => `l:${id}`
export const gateKey = (id: string) => `g:${id}`

const dataOf = (x: { data: { current?: unknown } } | null | undefined) => x?.data.current as DragData | undefined

/** Where a joke held over `over` would go, or null if it can't. */
function spotFor(beat: Beat, over: DragData, below: boolean): Spot | null {
  const list = beat.entries.find((e) => e.id === over.entryId)
  if (!list || !hasPieces(list)) return null
  const rows = rowsOf(list.pieces)
  if (over.kind === 'list') return { entryId: over.entryId, gateId: null, index: rows.length }
  if (over.kind === 'gate') return { entryId: over.entryId, gateId: over.gateId, index: findRow(rows, over.gateId)?.guarded.length ?? 0 }
  if (over.kind !== 'joke') return null
  const at = spotOf(beat, over.pieceId)
  return at && { ...at, index: at.index + (below ? 1 : 0) }
}

export function useBeatDrag(beat: Beat, onDrop: (next: Beat) => void) {
  const [active, setActive] = useState<DragData | null>(null)
  const [preview, setPreview] = useState<Beat | null>(null)
  const lastOver = useRef<UniqueIdentifier | null>(null)
  const settling = useRef(false) // just moved to another list: hold the target a frame
  // Where it came from at the last move, and how far down it was then: going straight back takes
  // a real move (24 px), so a joke on the edge of a gate doesn't flicker in and out of it.
  const cameFrom = useRef<{ place: string; y: number } | null>(null)
  const sensors = useSensors(
    // A small move (or, on a touch screen, a short hold on the grip) before a drag starts.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const collisionDetection: CollisionDetection = (args) => {
    const held = dataOf(args.active)
    if (held?.kind === 'entry') return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => dataOf(c)?.kind === 'entry') })
    if (held?.kind !== 'joke') return []
    if (settling.current && lastOver.current) return [{ id: lastOver.current }]
    // Still over its own place: it stays there.
    const self = args.droppableRects.get(args.active.id), at = args.pointerCoordinates
    if (self && at && at.x >= self.left && at.x <= self.right && at.y >= self.top && at.y <= self.bottom) return [{ id: args.active.id }]
    // Not into itself, and not so deep that gates would go past two levels.
    const fits = args.droppableContainers.filter((c) => {
      const d = dataOf(c)
      if (!d || d.kind === 'entry' || c.id === args.active.id) return false
      if (d.kind === 'joke') return !d.inside.includes(held.pieceId) && d.depth + held.height <= GATE_DEPTH
      if (d.kind === 'gate') return d.gateId !== held.pieceId && !d.inside.includes(held.pieceId) && d.depth + held.height <= GATE_DEPTH
      return true
    })
    const area = (id: UniqueIdentifier) => { const r = args.droppableRects.get(id); return r ? r.width * r.height : Infinity }
    const hits = pointerWithin({ ...args, droppableContainers: fits }).sort((a, b) => area(a.id) - area(b.id))
    const hit = hits[0] && fits.find((c) => c.id === hits[0].id)
    const d = dataOf(hit)
    // Over a list or a gate between its jokes: the nearest of its own jokes, else its end.
    const own = d && d.kind !== 'joke' ? fits.filter((c) => { const x = dataOf(c); return x?.kind === 'joke' && x.entryId === d.entryId && x.gateId === (d.kind === 'gate' ? d.gateId : null) }) : []
    const found = own.length ? closestCenter({ ...args, droppableContainers: own }) : hit ? [{ id: hit.id }] : closestCenter({ ...args, droppableContainers: fits.filter((c) => dataOf(c)?.kind === 'joke') })
    lastOver.current = found[0]?.id ?? null
    return found
  }

  const onDragStart = ({ active: a }: DragStartEvent) => { setActive(dataOf(a) ?? null); setPreview(beat) }

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    const held = dataOf(a), target = dataOf(over)
    if (held?.kind !== 'joke' || !target || !over || !preview) return
    const now = spotOf(preview, held.pieceId)
    const below = (a.rect.current.translated?.top ?? 0) > over.rect.top + over.rect.height / 2
    const to = spotFor(preview, target, below)
    if (!now || !to || placeOf(to) === placeOf(now)) return
    const y = a.rect.current.translated?.top ?? 0
    if (cameFrom.current?.place === placeOf(to) && Math.abs(y - cameFrom.current.y) < 24) return
    const next = moveJoke(preview, held.pieceId, to)
    if (next === preview) return
    cameFrom.current = { place: placeOf(now), y }
    settling.current = true
    requestAnimationFrame(() => { settling.current = false })
    setPreview(next)
  }

  const finish = () => { setActive(null); setPreview(null); lastOver.current = null; cameFrom.current = null }

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const held = dataOf(a), target = dataOf(over)
    let next = preview ?? beat
    if (held?.kind === 'entry' && target?.kind === 'entry') next = { ...beat, entries: moveEntry(beat.entries, held.entryId, beat.entries.findIndex((e) => e.id === target.entryId)) }
    if (held?.kind === 'joke' && target?.kind === 'joke' && over?.id !== a.id) {
      const now = spotOf(next, held.pieceId), to = spotOf(next, target.pieceId)
      if (now && to && now.entryId === to.entryId && now.gateId === to.gateId) next = moveJoke(next, held.pieceId, to)
    }
    finish()
    if (next !== beat) onDrop(next)
  }

  return {
    shown: preview ?? beat,
    active,
    context: { sensors, collisionDetection, onDragStart, onDragOver, onDragEnd, onDragCancel: finish, measuring: { droppable: { strategy: MeasuringStrategy.Always } } },
  }
}
