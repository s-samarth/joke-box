/**
 * What the server takes in one brainstorm session (app/schemas/notebook.py). A save over a limit
 * is refused, and an autosave every few seconds used to send it again each time, so it's checked
 * here first. One very long stroke is split instead (the server takes 5,000 points a stroke):
 * the pieces overlap by a point, so the line still looks like one.
 */
import type { Stroke, WritingSessionInput } from './types'

export const MAX_POINTS = 5000
export const MAX_STROKES = 10_000
const MAX_TITLE = 200
const MAX_LINKS = 200

/** Each stroke longer than the server takes, cut into pieces it does take. */
export function splitLongStrokes(ink: Stroke[]): Stroke[] {
  if (!ink.some((s) => s.points.length > MAX_POINTS)) return ink
  const out: Stroke[] = []
  for (const s of ink) {
    if (s.points.length <= MAX_POINTS) {
      out.push(s)
      continue
    }
    for (let start = 0; start < s.points.length - 1; start += MAX_POINTS - 1) {
      out.push({ ...s, points: s.points.slice(start, start + MAX_POINTS) })
    }
  }
  return out
}

/** How many strokes the server will count once long ones are split. */
export function strokeCount(ink: Stroke[]): number {
  let count = 0
  for (const s of ink) count += s.points.length <= MAX_POINTS ? 1 : Math.ceil((s.points.length - 1) / (MAX_POINTS - 1))
  return count
}

/** Why this session can't be saved as it is, in words to show; null if it can. */
export function tooBig(input: WritingSessionInput): string | null {
  if (strokeCount(input.ink) > MAX_STROKES) {
    return "This session is full: it can't sync more than 10,000 strokes. Start a new session to keep writing; what's here stays on this device."
  }
  if (input.title.length > MAX_TITLE) return 'The title is too long to sync: keep it under 200 characters.'
  if (input.joke_ids.length > MAX_LINKS || input.observation_ids.length > MAX_LINKS) {
    return 'Too many links to sync: a session links up to 200 jokes and 200 observations.'
  }
  return null
}
