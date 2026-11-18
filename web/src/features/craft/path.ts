/**
 * Where you are on your path: the first Path note with tick boxes still to tick, its next step,
 * and, when that step names minutes, how much solid material you have on one topic so far.
 * A Path note can hold several tracks: the tick boxes under each heading are one track, climbed
 * side by side (levels for material, stage and audience, say).
 */
import type { Joke, CraftNote } from '../../api/types'
import { parseBody, type ListItem } from './bodyFormat'

/** One staircase: the tick boxes under one heading (or the whole note, with no headings). */
export interface Track {
  /** The heading the boxes sit under, or null for boxes before any heading. */
  name: string | null
  boxes: ListItem[]
  done: number
  /** The first unticked box, or null when the track is finished. */
  next: ListItem | null
}

export interface NextStep {
  note: CraftNote
  done: number
  total: number
  next: ListItem
  tracks: Track[]
}

/** A note's tick boxes, grouped by the heading above them, in the order they appear. */
export function pathTracks(body: string): Track[] {
  const groups: { name: string | null; boxes: ListItem[] }[] = []
  let name: string | null = null
  for (const block of parseBody(body)) {
    if (block.type === 'heading') name = block.text.replace(/\*\*/g, '')
    if (block.type !== 'list') continue
    const boxes = block.items.filter((i) => !i.nested && i.checked !== null)
    if (!boxes.length) continue
    const last = groups.at(-1)
    if (last && last.name === name) last.boxes.push(...boxes)
    else groups.push({ name, boxes })
  }
  return groups.map((g) => ({ ...g, done: g.boxes.filter((b) => b.checked).length, next: g.boxes.find((b) => !b.checked) ?? null }))
}

export function nextStep(notes: CraftNote[]): NextStep | null {
  const paths = notes.filter((n) => n.behaviour === 'path').sort((a, b) => a.position - b.position)
  for (const note of paths) {
    const tracks = pathTracks(note.body)
    const boxes = tracks.flatMap((t) => t.boxes)
    const next = boxes.find((i) => !i.checked)
    if (next) return { note, done: boxes.filter((i) => i.checked).length, total: boxes.length, next, tracks }
  }
  return null
}

/** "A solid 10 mins on one topic" -> 10. An hour is 60. */
export function targetMinutes(text: string): number | null {
  const mins = text.match(/(\d+)\s*-?\s*min/i)
  if (mins) return Number(mins[1])
  return /\b(an|one) hour\b/i.test(text) ? 60 : null
}

/** A joke counts as solid at Strong (4) or Killer (5). */
export const SOLID = 4

/** The topic with the most solid material, by total runtime. */
export function mostSolidTopic(jokes: Joke[]): { topicId: string; seconds: number } | null {
  const byTopic = new Map<string, number>()
  for (const b of jokes) if ((b.strength ?? 0) >= SOLID) byTopic.set(b.topic_id, (byTopic.get(b.topic_id) ?? 0) + b.duration_seconds)
  const best = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? { topicId: best[0], seconds: best[1] } : null
}
