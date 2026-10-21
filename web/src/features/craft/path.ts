/**
 * Where you are on your path: the first Path note with tick boxes still to tick, its next step,
 * and, when that step names minutes, how much solid material you have on one topic so far.
 */
import type { Bit, CraftNote } from '../../api/types'
import { listItems, type ListItem } from './bodyFormat'

export interface NextStep {
  note: CraftNote
  done: number
  total: number
  next: ListItem
}

export function nextStep(notes: CraftNote[]): NextStep | null {
  const paths = notes.filter((n) => n.kind === 'path').sort((a, b) => a.position - b.position)
  for (const note of paths) {
    const boxes = listItems(note.body).filter((i) => i.checked !== null)
    const next = boxes.find((i) => !i.checked)
    if (next) return { note, done: boxes.filter((i) => i.checked).length, total: boxes.length, next }
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
export function mostSolidTopic(bits: Bit[]): { topicId: string; seconds: number } | null {
  const byTopic = new Map<string, number>()
  for (const b of bits) if (b.strength >= SOLID) byTopic.set(b.topic_id, (byTopic.get(b.topic_id) ?? 0) + b.duration_seconds)
  const best = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? { topicId: best[0], seconds: best[1] } : null
}
