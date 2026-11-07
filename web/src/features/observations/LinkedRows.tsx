/** What's linked, each a tap away (when it has a `to`), with × to unlink. Nothing linked: a quiet line saying so. */
import { X } from 'lucide-react'
import { Link } from 'react-router'
import { IconButton } from '../../components/ui/Button'

export interface LinkedRow {
  id: string
  to?: string
  text: string
  sub?: string
}

function Row({ row }: { row: LinkedRow }) {
  return (
    <>
      <span className="line-clamp-3 text-[15px]">{row.text}</span>
      {row.sub && <span className="mt-1 block text-xs text-faint">{row.sub}</span>}
    </>
  )
}

export function LinkedRows({ rows, empty, unlinkLabel, onUnlink }: { rows: LinkedRow[]; empty: string; unlinkLabel: string; onUnlink: (id: string) => void }) {
  if (rows.length === 0) return <p className="text-[15px] text-dim">{empty}</p>
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {rows.map((r) => (
        <li key={r.id} className="flex items-start gap-2 py-2.5">
          {r.to ? (
            <Link to={r.to} className="min-w-0 flex-1 leading-snug hover:text-tape"><Row row={r} /></Link>
          ) : (
            <div className="min-w-0 flex-1 leading-snug"><Row row={r} /></div>
          )}
          <IconButton label={unlinkLabel} onClick={() => onUnlink(r.id)}><X size={16} /></IconButton>
        </li>
      ))}
    </ul>
  )
}
