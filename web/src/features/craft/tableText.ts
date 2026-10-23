/**
 * Tables as text and back. The table editor works on cells; the note stores "| a | b |" lines,
 * with a "|---|" line under the first row when it's a header.
 */
import { parseBody } from './bodyFormat'

export interface TableData {
  /** Column names, or null for a table with no header row. */
  head: string[] | null
  rows: string[][]
}

export const BLANK_TABLE: TableData = { head: ['', ''], rows: [['', ''], ['', '']] }

/** The table in some note text, or a blank one if there isn't one. */
export function readTable(text: string): TableData {
  const block = parseBody(text).find((b) => b.type === 'table')
  if (block?.type !== 'table') return BLANK_TABLE
  return { head: block.head.length ? block.head : null, rows: block.rows }
}

/** A cell as it can be stored: one line, and no "|", which would split it in two. */
const clean = (cell: string) => cell.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim()

/** The table as note text. Empty rows, and a header with no names, are dropped; short rows are padded. */
export function writeTable({ head, rows }: TableData): string {
  const kept = rows.filter((r) => r.some((c) => clean(c)))
  const width = Math.max(1, head?.length ?? 0, ...kept.map((r) => r.length))
  const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => clean(cells[i] ?? '')).join(' | ')} |`
  const lines = kept.map(line)
  const named = head?.some((c) => clean(c))
  return (head && named ? [line(head), `|${'---|'.repeat(width)}`, ...lines] : lines).join('\n')
}
