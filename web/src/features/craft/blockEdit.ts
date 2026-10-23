/**
 * Changing one block of a note in place: swap its lines for new text, take it out, or add a new
 * block after it. Blocks are found by line (see parseSpans), with a blank line kept between them.
 */
import { STEPS } from './editText'

export type NewBlock = 'text' | 'heading' | 'list' | 'numbered' | 'tick' | 'callout' | 'steps' | 'table' | 'divider'

/** The text a new block starts with, and what to select in it. Tables and dividers don't open a text box. */
export const STARTS: Record<Exclude<NewBlock, 'table' | 'divider'>, { text: string; select?: [number, number] }> = {
  text: { text: '' },
  heading: { text: '## ' },
  list: { text: '- ' },
  numbered: { text: '1. ' },
  tick: { text: '- [ ] ' },
  callout: { text: '> ' },
  steps: { text: STEPS, select: [0, STEPS.length] },
}

export interface Place {
  from: number
  to: number
  /** The block's text when editing began, to find it again if the note changed meanwhile. */
  text: string
}

export const linesOf = (body: string, from: number, to: number) => body.split('\n').slice(from, to + 1).join('\n')

const trimEnd = (text: string) => text.replace(/\s+$/, '')

/**
 * The block's lines now. Usually where it was; if the note changed meanwhile (a tick, another
 * device), wherever its text has moved to. Null if it's gone.
 */
function locate(body: string, place: Place): [number, number] | null {
  if (linesOf(body, place.from, place.to) === place.text) return [place.from, place.to]
  const at = body.indexOf(place.text)
  if (at < 0 || !place.text) return null
  const from = body.slice(0, at).split('\n').length - 1
  return [from, from + place.text.split('\n').length - 1]
}

/** The note with the block replaced by `text`, or taken out if `text` is empty. Null if the block is gone. */
export function replaceBlock(body: string, place: Place, text: string): string | null {
  const found = locate(body, place)
  if (!found) return null
  const [from, to] = found
  const lines = body.split('\n')
  if (trimEnd(text)) return [...lines.slice(0, from), ...trimEnd(text).split('\n'), ...lines.slice(to + 1)].join('\n')
  // Taking a block out leaves one blank line between its neighbours, not two.
  const blankBoth = !lines[from - 1]?.trim() && !lines[to + 1]?.trim()
  const kept = [...lines.slice(0, from), ...lines.slice(to + 1 + (blankBoth && to + 1 < lines.length ? 1 : 0))]
  return kept.join('\n').replace(/^\n+/, '')
}

/** The note with a new block after line `after` (-1 puts it at the top), a blank line either side. */
export function insertAfter(body: string, after: number, text: string): string {
  const lines = body ? body.split('\n') : []
  const before = lines.slice(0, after + 1)
  const rest = lines.slice(after + 1)
  const out = [...before]
  if (out.length && out[out.length - 1].trim()) out.push('')
  out.push(...trimEnd(text).split('\n'))
  if (rest.length && rest[0].trim()) out.push('')
  return [...out, ...rest].join('\n')
}
