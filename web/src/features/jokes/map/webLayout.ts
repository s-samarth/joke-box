/**
 * Where everything goes on the premise web.
 *
 * Each premise is a web: its card in the middle and the jokes resting on it on rings around it,
 * like a clock read from the top, in reading order (jokesOn). A ring fills before the next one
 * starts; each ring is a wider ellipse, since the boxes are wider than they are tall, and the
 * spacing is worked out so no two boxes ever overlap. Webs sit in rows, in topic order.
 *
 * A web shows all its jokes even when the filters hide some; the hidden ones come back dimmed,
 * like a chain on the map.
 */
import { jokesOn } from '../../../lib/premises'
import { NODE } from './mapLayout'

interface Item {
  id: string
  premise_id?: string | null
  follows_id?: string | null
  created_at: string
}

interface PremiseItem {
  id: string
  topic_id: string
}

export const CARD = { w: 264, h: 136 }
const PAD = 32
const HEAD = 40
const GAP = 48

/** Ring k (from 1) holds 4 + 4k jokes on an ellipse this wide and tall. */
const ring = (k: number) => ({ slots: 4 + 4 * k, rx: 330 + 270 * (k - 1), ry: 190 + 190 * (k - 1) })

/** The centres of `n` jokes around a premise at (0, 0). */
export function ringSpots(n: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let k = 1; out.length < n; k++) {
    const { slots, rx, ry } = ring(k)
    const here = Math.min(slots, n - out.length)
    // A ring that isn't full spreads its jokes over its slots, starting at the top. Every ring is
    // turned half a slot from the one inside it, so neighbours never line up.
    const step = (2 * Math.PI) / slots
    for (let i = 0; i < here; i++) {
      const slot = Math.floor((i * slots) / here)
      const a = -Math.PI / 2 + slot * step + (k % 2 === 0 ? step / 2 : 0)
      out.push({ x: Math.round(rx * Math.cos(a)), y: Math.round(ry * Math.sin(a)) })
    }
  }
  return out
}

export interface WebNode<T> {
  joke: T
  x: number
  y: number
  dim: boolean
}

export interface WebLine {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  /** A spoke from the premise, or an arrow from a joke to the one that follows it. */
  kind: 'spoke' | 'chain'
  dim: boolean
}

export interface Web<T, P> {
  premise: P
  /** The frame around the web, and the premise card's top left. */
  x: number
  y: number
  w: number
  h: number
  card: { x: number; y: number }
  nodes: WebNode<T>[]
  lines: WebLine[]
}

/** Where a line from the centre of a box (half sizes hw, hh) towards (tx, ty) leaves it. */
function leave(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number) {
  const dx = tx - cx
  const dy = ty - cy
  const t = Math.min(Math.abs(dx) ? hw / Math.abs(dx) : Infinity, Math.abs(dy) ? hh / Math.abs(dy) : Infinity)
  return { x: cx + dx * t, y: cy + dy * t }
}

/** One premise's web with its centre at (0, 0), and how far it reaches each way. */
function buildWeb<T extends Item>(premiseId: string, all: T[], shownIds: Set<string>) {
  const members = jokesOn(premiseId, all)
  const spots = ringSpots(members.length)
  const nodes = members.map((joke, i) => ({ joke, x: spots[i].x - NODE.w / 2, y: spots[i].y - NODE.h / 2, dim: !shownIds.has(joke.id) }))
  const xs = [CARD.w / 2, ...spots.map((s) => Math.abs(s.x) + NODE.w / 2)]
  const ys = [CARD.h / 2, ...spots.map((s) => Math.abs(s.y) + NODE.h / 2)]
  return { nodes, reach: { x: Math.max(...xs), y: Math.max(...ys) } }
}

export function layoutWebs<T extends Item, P extends PremiseItem>(shown: T[], all: T[], premises: P[], topicOrder: string[], includeEmpty: boolean, rowWidth = 1400) {
  const shownIds = new Set(shown.map((j) => j.id))
  const used = new Set(shown.map((j) => j.premise_id).filter(Boolean))
  const rank = (topicId: string) => (topicOrder.includes(topicId) ? topicOrder.indexOf(topicId) : topicOrder.length)
  const drawn = premises.filter((p) => used.has(p.id) || includeEmpty).sort((a, b) => rank(a.topic_id) - rank(b.topic_id))

  const webs: Web<T, P>[] = []
  let rowX = 0
  let rowY = 0
  let rowH = 0
  for (const premise of drawn) {
    const { nodes, reach } = buildWeb(premise.id, all, shownIds)
    const w = 2 * (reach.x + PAD)
    const h = HEAD + 2 * (reach.y + PAD)
    if (rowX > 0 && rowX + w > rowWidth) {
      rowX = 0
      rowY += rowH + GAP
      rowH = 0
    }
    const cx = rowX + w / 2
    const cy = rowY + HEAD + h / 2 - HEAD / 2
    const placed = nodes.map((n) => ({ ...n, x: n.x + cx, y: n.y + cy }))
    const at = new Map(placed.map((n) => [n.joke.id, n]))
    const lines: WebLine[] = []
    for (const n of placed) {
      const [nx, ny] = [n.x + NODE.w / 2, n.y + NODE.h / 2]
      const a = leave(cx, cy, CARD.w / 2, CARD.h / 2, nx, ny)
      const b = leave(nx, ny, NODE.w / 2, NODE.h / 2, cx, cy)
      lines.push({ key: `s${n.joke.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'spoke', dim: n.dim })
      const before = n.joke.follows_id ? at.get(n.joke.follows_id) : undefined
      if (before) {
        const [px, py] = [before.x + NODE.w / 2, before.y + NODE.h / 2]
        const s = leave(px, py, NODE.w / 2, NODE.h / 2, nx, ny)
        const e = leave(nx, ny, NODE.w / 2, NODE.h / 2, px, py)
        lines.push({ key: `c${n.joke.id}`, x1: s.x, y1: s.y, x2: e.x, y2: e.y, kind: 'chain', dim: n.dim || before.dim })
      }
    }
    webs.push({ premise, x: rowX, y: rowY, w, h, card: { x: cx - CARD.w / 2, y: cy - CARD.h / 2 }, nodes: placed, lines })
    rowX += w + GAP
    rowH = Math.max(rowH, h)
  }
  const width = webs.length ? Math.max(...webs.map((w) => w.x + w.w)) : 0
  const height = webs.length ? Math.max(...webs.map((w) => w.y + w.h)) : 0
  return { webs, width, height }
}
