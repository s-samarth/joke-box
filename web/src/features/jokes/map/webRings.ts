/**
 * Where each joke sits around its premise on the premise web, with the premise at (0, 0).
 *
 * The jokes form trees: a joke whose joke before isn't on this premise starts a chain, and the
 * premise points to it; a joke that follows another sits one ring further out, roughly in line
 * with it, so a chain reads outwards from the middle. Each chain gets a slice of the circle sized
 * to how many branch ends it has, and every joke goes to the free slot nearest the middle of its
 * slice (one ring further out if its own is full).
 *
 * The slots are fixed points on rings: ring k (from 1) holds 4 + 4k of them on an ellipse, since
 * the boxes are wider than they are tall, and each ring is turned half a slot from the one inside
 * it. No two slots on any rings ever overlap, so no two jokes do.
 */

interface Linked {
  id: string
  follows_id?: string | null
}

export type Point = { x: number; y: number }

const ring = (k: number) => ({ slots: 4 + 4 * k, rx: 440 + 300 * (k - 1), ry: 260 + 210 * (k - 1) })
const TOP = -Math.PI / 2
const TURN = 2 * Math.PI

/** The angle of slot i on ring k, starting at the top and going clockwise. */
const slotAngle = (k: number, i: number) => {
  const step = TURN / ring(k).slots
  return TOP + i * step + (k % 2 === 0 ? step / 2 : 0)
}

/** The centre of slot i on ring k. */
export function slotSpot(k: number, i: number): Point {
  const { rx, ry } = ring(k)
  const a = slotAngle(k, i)
  return { x: Math.round(rx * Math.cos(a)), y: Math.round(ry * Math.sin(a)) }
}

export const slotsOn = (k: number) => ring(k).slots

/** Jokes in reading order (jokesOn); returns each one's centre. */
export function placeWeb<T extends Linked>(members: T[]): Map<string, Point> {
  const ids = new Set(members.map((j) => j.id))
  const kids = new Map<string, T[]>()
  for (const j of members) if (j.follows_id && ids.has(j.follows_id)) kids.set(j.follows_id, [...(kids.get(j.follows_id) ?? []), j])
  const roots = members.filter((j) => !j.follows_id || !ids.has(j.follows_id))

  const ends = new Map<string, number>()
  const countEnds = (j: T): number => {
    const n = Math.max(1, (kids.get(j.id) ?? []).reduce((s, k) => s + countEnds(k), 0))
    ends.set(j.id, n)
    return n
  }
  for (const r of roots) countEnds(r)

  // Each joke's slice of the circle, as fractions of a turn; it aims for the slice's middle. The
  // circle is turned so the first chain's slice is centred at the top.
  const aim = new Map<string, number>()
  const turn = roots.length ? (ends.get(roots[0].id) ?? 1) / roots.reduce((s, r) => s + (ends.get(r.id) ?? 1), 0) / 2 : 0
  const share = (list: T[], from: number, to: number) => {
    const sum = list.reduce((s, j) => s + (ends.get(j.id) ?? 1), 0)
    let at = from
    for (const j of list) {
      const end = at + ((to - from) * (ends.get(j.id) ?? 1)) / sum
      aim.set(j.id, TOP + ((at + end) / 2 - turn) * TURN)
      share(kids.get(j.id) ?? [], at, end)
      at = end
    }
  }
  share(roots, 0, 1)

  // Inner rings first: every chain's start, then whatever follows them, and so on out.
  const taken = new Map<number, Set<number>>()
  const out = new Map<string, Point>()
  const ringOf = new Map<string, number>()
  const place = (j: T, from: number) => {
    for (let k = from; ; k++) {
      const n = slotsOn(k)
      const used = taken.get(k) ?? new Set<number>()
      if (used.size >= n) continue
      const a = aim.get(j.id) ?? TOP
      const near = ((Math.round(((a - slotAngle(k, 0)) / TURN) * n) % n) + n) % n
      for (let d = 0; d < n; d++) {
        const slot = [(near + d) % n, (near - d + n) % n].find((s) => !used.has(s))
        if (slot === undefined) continue
        used.add(slot)
        taken.set(k, used)
        ringOf.set(j.id, k)
        out.set(j.id, slotSpot(k, slot))
        return
      }
    }
  }
  for (let wave: T[] = roots; wave.length; ) {
    for (const j of wave) place(j, j.follows_id && ringOf.has(j.follows_id) ? ringOf.get(j.follows_id)! + 1 : 1)
    wave = wave.flatMap((j) => kids.get(j.id) ?? [])
  }
  return out
}
