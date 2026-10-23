/**
 * Where each joke goes on the joke board.
 *
 * Each topic is an island; islands sit in rows, in your topic order. Inside an island, jokes are
 * scattered over a loose grid: every box gets a small nudge and tilt worked out from its id, so the
 * board looks hand-placed but is the same every time and boxes never overlap. A chain stays
 * together, in its first joke's island, on cells next to each other, with arrows between them.
 *
 * A joke you moved by hand (a spot) sits where you left it, relative to its island's top left, so
 * it moves with the island as the board grows. Grid cells under it are skipped. A spot saved in
 * another island (the joke changed topic since) is ignored.
 */
import { chainTo } from '../../../lib/chains'
import { NODE } from './mapLayout'

interface Item {
  id: string
  follows_id?: string | null
  created_at: string
  topic_id: string
}

export interface Spot {
  topic_id: string
  x: number
  y: number
}

export const CELL = { w: NODE.w + 36, h: NODE.h + 32 }
const PAD = 24
const HEAD = 40
const GAP = 56
const MIN_ISLAND = 300

export interface BoardBox<T> {
  joke: T
  x: number
  y: number
  tilt: number
  dim: boolean
  pinned: boolean
  island: string
  /** Which chain it's in, if any, to light the chain up together. */
  chain: number | null
}

export interface Island {
  topicId: string
  x: number
  y: number
  w: number
  h: number
  /** Where the island's contents start: a spot is measured from here. */
  origin: { x: number; y: number }
  count: number
}

export interface BoardEdge {
  from: string
  to: string
  chain: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Board<T> {
  boxes: BoardBox<T>[]
  edges: BoardEdge[]
  islands: Island[]
  width: number
  height: number
  chains: number
}

/** A small, stable number from an id (FNV-1a), for the nudge and tilt. */
function hash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

export const nudge = (id: string) => {
  const h = hash(id)
  return { dx: (h % 21) - 10, dy: ((h >>> 5) % 17) - 8, tilt: (((h >>> 10) % 9) - 4) * 0.5 }
}

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < CELL.w - 8 && Math.abs(a.y - b.y) < CELL.h - 8

/** The point where a line from a box's centre towards (tx, ty) leaves the box. */
function leave(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx
  const dy = ty - cy
  const t = Math.min(Math.abs(dx) ? NODE.w / 2 / Math.abs(dx) : Infinity, Math.abs(dy) ? NODE.h / 2 / Math.abs(dy) : Infinity)
  return { x: cx + dx * t, y: cy + dy * t }
}

export function layoutBoard<T extends Item>(shown: T[], all: T[], topicOrder: string[], spots: Map<string, Spot>, rowWidth = 1400): Board<T> {
  const byId = new Map(all.map((j) => [j.id, j]))
  const shownIds = new Set(shown.map((j) => j.id))
  const followers = new Map<string, T[]>()
  for (const j of all) if (j.follows_id && byId.has(j.follows_id)) followers.set(j.follows_id, [...(followers.get(j.follows_id) ?? []), j])

  // Units: a chain (its first joke and everything after it) or a joke on its own.
  const units = new Map<string, { members: T[]; chain: number | null }[]>()
  const taken = new Set<string>()
  let chains = 0
  for (const joke of shown) {
    const first = chainTo(joke, byId)[0]
    if (taken.has(first.id)) continue
    const members: T[] = []
    for (const queue = [first]; queue.length; ) {
      const j = queue.shift()!
      if (taken.has(j.id)) continue
      taken.add(j.id)
      members.push(j)
      queue.push(...[...(followers.get(j.id) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)))
    }
    const list = units.get(first.topic_id) ?? []
    list.push({ members, chain: members.length > 1 ? chains++ : null })
    units.set(first.topic_id, list)
  }

  const order = [...topicOrder.filter((t) => units.has(t)), ...[...units.keys()].filter((t) => !topicOrder.includes(t))]
  const boxes: BoardBox<T>[] = []
  const islands: Island[] = []
  let rowX = 0
  let rowY = 0
  let rowH = 0
  for (const topicId of order) {
    const items = units.get(topicId)!.flatMap((u) => u.members.map((joke) => ({ joke, chain: u.chain })))
    const pins = items.flatMap(({ joke }) => {
      const s = spots.get(joke.id)
      return s && s.topic_id === topicId ? [{ id: joke.id, x: s.x, y: s.y }] : []
    })
    const pinned = new Map(pins.map((p) => [p.id, p]))
    const auto = items.filter(({ joke }) => !pinned.has(joke.id))
    // Roughly square, at most five across, and never wider than the room.
    const fits = Math.max(1, Math.floor((rowWidth - 2 * PAD) / CELL.w))
    const cols = Math.max(1, Math.min(5, fits, Math.ceil(Math.sqrt(auto.length * 1.4))))
    const local = new Map<string, { x: number; y: number }>()
    let cell = 0
    for (const { joke } of auto) {
      let at = { x: 0, y: 0 }
      do {
        at = { x: (cell % cols) * CELL.w, y: Math.floor(cell / cols) * CELL.h }
        cell += 1
      } while (pins.some((p) => overlaps(p, at)))
      const { dx, dy } = nudge(joke.id)
      local.set(joke.id, { x: at.x + 10 + dx, y: at.y + 8 + dy })
    }
    for (const p of pins) local.set(p.id, { x: p.x, y: p.y })

    const placed = [...local.values()]
    const w = Math.max(MIN_ISLAND, Math.max(...placed.map((s) => s.x)) + NODE.w + 2 * PAD)
    const h = HEAD + Math.max(...placed.map((s) => s.y)) + NODE.h + 2 * PAD
    if (rowX > 0 && rowX + w > rowWidth) {
      rowX = 0
      rowY += rowH + GAP
      rowH = 0
    }
    const island: Island = { topicId, x: rowX, y: rowY, w, h, origin: { x: rowX + PAD, y: rowY + HEAD + PAD }, count: items.length }
    islands.push(island)
    rowX += w + GAP
    rowH = Math.max(rowH, h)
    for (const { joke, chain } of items) {
      const p = local.get(joke.id)!
      boxes.push({
        joke, chain, island: topicId, pinned: pinned.has(joke.id), dim: !shownIds.has(joke.id),
        x: island.origin.x + p.x, y: island.origin.y + p.y, tilt: nudge(joke.id).tilt,
      })
    }
  }

  const at = new Map(boxes.map((b) => [b.joke.id, b]))
  const edges: BoardEdge[] = []
  for (const b of boxes) {
    const before = b.joke.follows_id ? at.get(b.joke.follows_id) : undefined
    if (!before || b.chain === null) continue
    const [ax, ay, bx, by] = [before.x + NODE.w / 2, before.y + NODE.h / 2, b.x + NODE.w / 2, b.y + NODE.h / 2]
    const start = leave(ax, ay, bx, by)
    const end = leave(bx, by, ax, ay)
    edges.push({ from: before.joke.id, to: b.joke.id, chain: b.chain, x1: start.x, y1: start.y, x2: end.x, y2: end.y })
  }
  const width = islands.length ? Math.max(...islands.map((i) => i.x + i.w)) : 0
  const height = islands.length ? Math.max(...islands.map((i) => i.y + i.h)) : 0
  return { boxes, edges, islands, width, height, chains }
}

/** Where a box dropped at (x, y) on the board sits in its island, never left of or above it. */
export function spotIn(island: Island, x: number, y: number): Spot {
  return { topic_id: island.topicId, x: Math.max(0, Math.round(x - island.origin.x)), y: Math.max(0, Math.round(y - island.origin.y)) }
}
