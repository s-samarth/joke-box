/**
 * Where each joke goes on the joke map.
 *
 * Chains are trees: a joke follows one joke, and several can follow the same one. Each chain is
 * drawn left to right: its first joke in the left column, each joke's followers in the next,
 * branches stacked under each other, and a joke level with the middle of its followers. Chains
 * sit one under another, in the order their jokes come in the list. Jokes in no chain go in a
 * plain grid under the map.
 *
 * A chain is drawn whole even when the filters hide part of it; the hidden jokes come back dimmed,
 * so the arrows never jump a gap.
 */
import { chainTo } from '../../../lib/chains'

interface Linked {
  id: string
  follows_id?: string | null
  created_at: string
}

export const NODE = { w: 232, h: 112 }
const GAP = { x: 56, y: 16, chain: 40 }

export interface MapNode<T> {
  joke: T
  x: number
  y: number
  /** Which chain it's in, to light the chain up together. */
  chain: number
  /** Hidden by the filters, shown only to keep its chain whole. */
  dim: boolean
}

export interface MapEdge {
  from: string
  to: string
  chain: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MapLayout<T> {
  nodes: MapNode<T>[]
  edges: MapEdge[]
  width: number
  height: number
  /** Shown jokes that aren't in any chain. */
  singles: T[]
  chains: number
}

export function layoutMap<T extends Linked>(shown: T[], all: T[]): MapLayout<T> {
  const byId = new Map(all.map((j) => [j.id, j]))
  const shownIds = new Set(shown.map((j) => j.id))
  const followers = new Map<string, T[]>()
  for (const j of all) {
    if (!j.follows_id || !byId.has(j.follows_id)) continue
    followers.set(j.follows_id, [...(followers.get(j.follows_id) ?? []), j])
  }
  for (const list of followers.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at))

  const nodes: MapNode<T>[] = []
  const edges: MapEdge[] = []
  const singles: T[] = []
  const placed = new Set<string>()
  let top = 0
  let chains = 0

  /** Lays out `joke` and everything after it; returns its y. Leaves take the next free row. */
  const place = (joke: T, depth: number, chain: number): number => {
    placed.add(joke.id)
    const after = (followers.get(joke.id) ?? []).filter((f) => !placed.has(f.id))
    let y: number
    if (!after.length) {
      y = top
      top += NODE.h + GAP.y
    } else {
      const ys = after.map((f) => place(f, depth + 1, chain))
      y = (ys[0] + ys[ys.length - 1]) / 2
    }
    const x = depth * (NODE.w + GAP.x)
    nodes.push({ joke, x, y, chain, dim: !shownIds.has(joke.id) })
    return y
  }

  for (const joke of shown) {
    const first = chainTo(joke, byId)[0]
    if (placed.has(first.id)) continue
    if (!followers.get(first.id)?.length) {
      placed.add(first.id)
      if (shownIds.has(first.id)) singles.push(first)
      continue
    }
    place(first, 0, chains)
    chains += 1
    top += GAP.chain - GAP.y
  }

  const at = new Map(nodes.map((n) => [n.joke.id, n]))
  for (const n of nodes) {
    const before = n.joke.follows_id ? at.get(n.joke.follows_id) : undefined
    if (!before) continue
    edges.push({
      from: before.joke.id, to: n.joke.id, chain: n.chain,
      x1: before.x + NODE.w, y1: before.y + NODE.h / 2, x2: n.x, y2: n.y + NODE.h / 2,
    })
  }
  const width = nodes.length ? Math.max(...nodes.map((n) => n.x)) + NODE.w : 0
  const height = nodes.length ? top - GAP.chain : 0
  return { nodes, edges, width, height, singles, chains }
}
