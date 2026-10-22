/**
 * A table from a note. On a wide screen it's a real table; on a phone each row becomes a small
 * card, its first cell as the title and the other cells under their column names, so nothing
 * has to scroll sideways. Both are rendered and CSS picks one (`sm:` is 640px and up).
 */
import type { ReactNode } from 'react'

interface Props {
  head: string[]
  rows: string[][]
  /** Renders a cell's text, with bold and links. */
  cell: (text: string) => ReactNode
}

export function NoteTable({ head, rows, cell }: Props) {
  const width = Math.max(head.length, ...rows.map((r) => r.length))
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? '')
  return (
    <div>
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-rule sm:block">
        <table className="w-full border-collapse text-left text-sm">
          {head.length > 0 && (
            <thead className="bg-ink-3 text-paper">
              <tr>{pad(head).map((h, i) => <th key={i} scope="col" className="px-3 py-2 align-bottom font-semibold">{cell(h)}</th>)}</tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-rule first:border-t-0 even:bg-ink-2/60">
                {pad(r).map((c, ci) => (
                  <td key={ci} className={`px-3 py-2 align-top ${ci === 0 ? 'font-semibold text-paper' : 'text-paper/85'}`}>{cell(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 sm:hidden">
        {rows.map((r, ri) => (
          <li key={ri} className="rounded-xl bg-ink-2 px-3.5 py-3 ring-1 ring-rule">
            <p className="font-semibold text-paper">{cell(r[0] ?? '')}</p>
            <dl className="mt-1.5 space-y-1 text-sm">
              {pad(r).slice(1).map((c, ci) => c && (
                <div key={ci}>
                  {head[ci + 1] && <dt className="text-xs text-faint">{head[ci + 1]}</dt>}
                  <dd className="text-paper/85">{cell(c)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
