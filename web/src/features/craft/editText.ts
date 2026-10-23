/**
 * Text changes behind the note editor's toolbar and keys. Each takes the text and the selection
 * and returns the new text and where the selection should go, so they're plain functions that
 * can be tested without a browser.
 */

export interface Edit {
  value: string
  start: number
  end: number
}

/** What a new line of steps starts as, selected so typing replaces it. */
export const STEPS = 'First step → Second step → Third step'

export type LineKind = 'heading' | 'list' | 'numbered' | 'tick' | 'callout'

const PREFIX: Record<LineKind, string> = { heading: '## ', list: '- ', numbered: '1. ', tick: '- [ ] ', callout: '> ' }

/** Whatever already starts a line: its indent, then a heading, callout, tick box or list mark. */
const MARK = /^(\s*)(#{1,3} |> ?|- \[[ xX]\] |[-*] |\d+[.)] )?/
const KIND_OF: [LineKind, RegExp][] = [
  ['heading', /^#{1,3} $/], ['callout', /^> ?$/], ['tick', /^- \[[ xX]\] $/], ['numbered', /^\d+[.)] $/], ['list', /^[-*] $/],
]

const lineStart = (v: string, i: number) => v.lastIndexOf('\n', i - 1) + 1
/** Where the line holding position `i` ends. */
export const lineEnd = (v: string, i: number) => {
  const e = v.indexOf('\n', i)
  return e < 0 ? v.length : e
}
const kindOf = (mark = ''): LineKind | null => KIND_OF.find(([, re]) => re.test(mark))?.[0] ?? null

/**
 * Turn the selected lines into headings, list items, tick boxes or callouts. If they all are
 * that already, turn them back into plain lines. Blank lines are left alone.
 */
export function setLineKind(v: string, start: number, end: number, kind: LineKind): Edit {
  const from = lineStart(v, start)
  const to = lineEnd(v, end > start && v[end - 1] === '\n' ? end - 1 : end)
  const lines = v.slice(from, to).split('\n')
  const filled = lines.filter((l) => l.trim())
  const undo = filled.length > 0 && filled.every((l) => kindOf(l.match(MARK)?.[2]) === kind)
  let n = 0
  const next = lines.map((l) => {
    if (!l.trim() && lines.length > 1) return l
    const [whole, indent] = l.match(MARK) ?? ['', '']
    const rest = l.slice(whole.length)
    if (undo) return indent + rest
    n += 1
    const prefix = kind === 'numbered' ? `${n}. ` : PREFIX[kind]
    // A heading can't be indented, or it reads as a plain line.
    return (kind === 'heading' ? '' : indent) + prefix + rest
  })
  const text = next.join('\n')
  const value = v.slice(0, from) + text + v.slice(to)
  if (start === end) {
    const cursor = Math.max(from, start + text.length - (to - from))
    return { value, start: cursor, end: cursor }
  }
  return { value, start: from, end: from + text.length }
}

/** Bold the selection, or unbold it if it's bold already. With nothing selected, ready to type. */
export function toggleBold(v: string, start: number, end: number): Edit {
  if (v.slice(start - 2, start) === '**' && v.slice(end, end + 2) === '**') {
    return { value: v.slice(0, start - 2) + v.slice(start, end) + v.slice(end + 2), start: start - 2, end: end - 2 }
  }
  return { value: `${v.slice(0, start)}**${v.slice(start, end)}**${v.slice(end)}`, start: start + 2, end: end + 2 }
}

/**
 * Put a block (a table, a divider, a line of steps) in place of the selection, on lines of its
 * own with a blank line either side. `select` picks part of the block to select afterwards.
 */
export function insertBlock(v: string, start: number, end: number, block: string, select?: [number, number]): Edit {
  const before = v.slice(0, start)
  const after = v.slice(end)
  const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const trail = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const at = before.length + lead.length
  const [a, b] = select ?? [block.length, block.length]
  return { value: before + lead + block + trail + after, start: at + a, end: at + b }
}

/**
 * Enter at the end of a list item, tick box or callout starts the next one. Enter on an empty
 * one ends the list instead. Returns null when Enter should just be Enter.
 */
export function continueLine(v: string, start: number, end: number): Edit | null {
  if (start !== end) return null
  const from = lineStart(v, start)
  const line = v.slice(from, lineEnd(v, start))
  const m = line.match(/^(\s*)(- \[[ xX]\] |[-*] |(\d+)([.)]) |> )/)
  if (!m || start < from + m[0].length) return null
  if (!line.slice(m[0].length).trim()) {
    const value = v.slice(0, from) + v.slice(from + line.length)
    return { value, start: from, end: from }
  }
  const mark = m[3] ? `${Number(m[3]) + 1}${m[4]} ` : m[2].startsWith('- [') ? '- [ ] ' : m[2]
  const insert = `\n${m[1]}${mark}`
  return { value: v.slice(0, start) + insert + v.slice(start), start: start + insert.length, end: start + insert.length }
}

/**
 * Tab moves the selected list items in a level (two spaces), Shift+Tab back out. Returns null
 * when a selected line isn't a list item, so Tab keeps moving focus as usual.
 */
export function indentItems(v: string, start: number, end: number, out: boolean): Edit | null {
  const from = lineStart(v, start)
  const to = lineEnd(v, end)
  const lines = v.slice(from, to).split('\n')
  if (!lines.every((l) => !l.trim() || /^\s*(- |\* |\d+[.)] )/.test(l))) return null
  const first = lines[0]
  const next = lines.map((l) => (!l.trim() ? l : out ? l.replace(/^ {1,2}/, '') : `  ${l}`))
  const text = next.join('\n')
  const shift = next[0].length - first.length
  const value = v.slice(0, from) + text + v.slice(to)
  return { value, start: Math.max(from, start + shift), end: end + text.length - (to - from) }
}
