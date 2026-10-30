/**
 * Where everything goes on the premise web.
 *
 * Each premise is a web: its card in the middle, a green arrow out to the first joke of each
 * chain, and the jokes after it further out, joined by the chain's own arrows (webRings places
 * them). Webs sit in rows, in topic order.
 *
 * A web shows all its jokes even when the filters hide some; the hidden ones come back dimmed,
 * like a chain on the map.
 */
import { jokesOn } from '../../../lib/premises'
import { placeWeb } from './webRings'

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

/** The premise card, and the joke boxes around it: bigger than the map's, to read at a glance. */
export const CARD = { w: 300, h: 152 }
export const WEB_NODE = { w: 256, h: 120 }
const PAD = 32
const HEAD = 40
const GAP = 48

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
  /** An arrow out from the premise to a joke, or from a joke to the one that follows it. */
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

/** One premise's web with its centre at (0, 0), and the box around it, so the frame fits it snugly. */
function buildWeb<T extends Item>(premiseId: string, all: T[], shownIds: Set<string>) {
  const members = jokesOn(premiseId, all)
  const at = placeWeb(members)
  const spots = members.map((j) => at.get(j.id)!)
  const nodes = members.map((joke, i) => ({ joke, x: spots[i].x - WEB_NODE.w / 2, y: spots[i].y - WEB_NODE.h / 2, dim: !shownIds.has(joke.id) }))
  const xs = spots.map((s) => s.x)
  const ys = spots.map((s) => s.y)
  const bounds = {
    left: Math.min(-CARD.w / 2, ...xs.map((x) => x - WEB_NODE.w / 2)),
    right: Math.max(CARD.w / 2, ...xs.map((x) => x + WEB_NODE.w / 2)),
    top: Math.min(-CARD.h / 2, ...ys.map((y) => y - WEB_NODE.h / 2)),
    bottom: Math.max(CARD.h / 2, ...ys.map((y) => y + WEB_NODE.h / 2)),
  }
  return { nodes, bounds }
}

/** `to` moved `gap` back towards `from`, so an arrowhead stops just short of the box it points at. */
function short(from: { x: number; y: number }, to: { x: number; y: number }, gap = 6) {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1
  return { x: to.x - ((to.x - from.x) / len) * gap, y: to.y - ((to.y - from.y) / len) * gap }
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
    const { nodes, bounds } = buildWeb(premise.id, all, shownIds)
    const w = bounds.right - bounds.left + 2 * PAD
    const h = HEAD + bounds.bottom - bounds.top + 2 * PAD
    if (rowX > 0 && rowX + w > rowWidth) {
      rowX = 0
      rowY += rowH + GAP
      rowH = 0
    }
    const cx = rowX + PAD - bounds.left
    const cy = rowY + HEAD + PAD - bounds.top
    const placed = nodes.map((n) => ({ ...n, x: n.x + cx, y: n.y + cy }))
    const at = new Map(placed.map((n) => [n.joke.id, n]))
    const lines: WebLine[] = []
    for (const n of placed) {
      const [nx, ny] = [n.x + WEB_NODE.w / 2, n.y + WEB_NODE.h / 2]
      const a = leave(cx, cy, CARD.w / 2, CARD.h / 2, nx, ny)
      const b = short(a, leave(nx, ny, WEB_NODE.w / 2, WEB_NODE.h / 2, cx, cy))
      const before = n.joke.follows_id ? at.get(n.joke.follows_id) : undefined
      // The premise points only at a chain's first joke; the rest hang off the joke before them.
      if (!before) lines.push({ key: `s${n.joke.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'spoke', dim: n.dim })
      else {
        const [px, py] = [before.x + WEB_NODE.w / 2, before.y + WEB_NODE.h / 2]
        const s = leave(px, py, WEB_NODE.w / 2, WEB_NODE.h / 2, nx, ny)
        const e = short(s, leave(nx, ny, WEB_NODE.w / 2, WEB_NODE.h / 2, px, py))
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
