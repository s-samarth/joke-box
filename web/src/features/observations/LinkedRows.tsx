/** What's linked, each a tap away, with × to unlink. Nothing linked: a quiet line saying so. */
import { X } from 'lucide-react'
import { Link } from 'react-router'
import { IconButton } from '../../components/ui/Button'

export interface LinkedRow {
  id: string
  to: string
  text: string
  sub?: string
}

export function LinkedRows({ rows, empty, unlinkLabel, onUnlink }: { rows: LinkedRow[]; empty: string; unlinkLabel: string; onUnlink: (id: string) => void }) {
  if (rows.length === 0) return <p className="text-[15px] text-dim">{empty}</p>
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {rows.map((r) => (
        <li key={r.id} className="flex items-start gap-2 py-2.5">
          <Link to={r.to} className="min-w-0 flex-1 leading-snug hover:text-tape">
            <span className="line-clamp-3 text-[15px]">{r.text}</span>
            {r.sub && <span className="mt-1 block text-xs text-faint">{r.sub}</span>}
          </Link>
          <IconButton label={unlinkLabel} onClick={() => onUnlink(r.id)}><X size={16} /></IconButton>
        </li>
      ))}
    </ul>
  )
}
