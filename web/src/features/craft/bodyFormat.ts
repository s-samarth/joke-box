/**
 * A craft note's body is plain text with a little formatting, read line by line:
 * "# " headings, "- " or "1. " list items, "- [ ] " / "- [x] " tick boxes, **bold**,
 * and blank lines between paragraphs. Parsing it here keeps rendering free of raw HTML.
 */

export interface ListItem {
  text: string
  /** null for a plain item, true/false for a tick box. */
  checked: boolean | null
  /** Indented items sit one level in. */
  nested: boolean
  /** Line number in the body, so a tick can be written back. */
  line: number
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'para'; text: string }
  | { type: 'list'; ordered: boolean; items: ListItem[] }

const HEADING = /^(#{1,3})\s+(.*)$/
const ITEM = /^(\s*)(?:([-*])|(\d+)[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/

export function parseBody(body: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ type: 'para', text: para.join('\n') })
    para = []
  }
  body.split('\n').forEach((raw, line) => {
    const heading = raw.match(HEADING)
    const item = raw.match(ITEM)
    if (!raw.trim()) return flush()
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() })
      return
    }
    if (item) {
      flush()
      const ordered = Boolean(item[3])
      const entry: ListItem = { text: item[5], checked: item[4] === undefined ? null : item[4] !== ' ', nested: item[1].length >= 2, line }
      const last = blocks.at(-1)
      if (last?.type === 'list' && (last.ordered === ordered || entry.nested)) last.items.push(entry)
      else blocks.push({ type: 'list', ordered, items: [entry] })
      return
    }
    para.push(raw.trim())
  })
  flush()
  return blocks
}

/** Flip the tick box on one line of the body. Lines without one are left alone. */
export function toggleTick(body: string, line: number): string {
  const lines = body.split('\n')
  lines[line] = lines[line]?.replace(/\[([ xX])\]/, (_, mark: string) => (mark === ' ' ? '[x]' : '[ ]')) ?? ''
  return lines.join('\n')
}

export interface Run {
  text: string
  bold: boolean
  /** Set when the run is a web address, so it can be shown as a link. */
  href?: string
}

const URL = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)])/

/** Text split into plain, **bold** and web-address runs. */
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  for (const part of text.split(/(\*\*[^*]+\*\*)/).filter(Boolean)) {
    const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4
    const inner = bold ? part.slice(2, -2) : part
    for (const piece of inner.split(URL).filter(Boolean)) {
      runs.push(URL.test(piece) && /^https?:\/\//.test(piece) ? { text: piece, bold, href: piece } : { text: piece, bold })
    }
  }
  return runs
}

/** Every top-level list item in the note, for ticking through a checklist. */
export function listItems(body: string): ListItem[] {
  return parseBody(body).flatMap((b) => (b.type === 'list' ? b.items.filter((i) => !i.nested) : []))
}

/** The items under a "Prompts" heading, for a technique to cycle through. */
export function prompts(body: string): string[] {
  const blocks = parseBody(body)
  const start = blocks.findIndex((b) => b.type === 'heading' && /prompt/i.test(b.text))
  if (start < 0) return []
  const out: string[] = []
  for (const block of blocks.slice(start + 1)) {
    if (block.type === 'heading') break
    if (block.type === 'list') out.push(...block.items.map((i) => i.text))
  }
  return out
}
