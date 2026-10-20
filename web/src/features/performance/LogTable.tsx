/** Sortable log table on desktop, stacked cards on phones. Each row: View, Edit, Delete. */
import { ArrowDown, ArrowUp, Eye, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react'
import type { PerformanceLog } from '../../api/types'
import { Dropdown } from '../../components/ui/Menu'
import { clock } from '../../lib/duration'
import { formatDate, formatTime } from '../../lib/time'
import type { SortKey } from './logMath'

interface Props {
  logs: PerformanceLog[]
  sort: { key: SortKey; desc: boolean }
  onSort: (key: SortKey) => void
  onView: (log: PerformanceLog) => void
  onEdit: (log: PerformanceLog) => void
  onDelete: (log: PerformanceLog) => void
}

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex" aria-label={`${n} of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= n ? 'fill-accent text-accent' : 'text-white/15'} />)}
  </span>
)

export function LogTable({ logs, sort, onSort, onView, onEdit, onDelete }: Props) {
  const menu = (log: PerformanceLog) => (
    <Dropdown
      trigger={<button type="button" aria-label="Log options" className="inline-flex size-9 items-center justify-center rounded-xl text-faint hover:bg-white/5 hover:text-text"><MoreHorizontal size={18} /></button>}
      items={[
        { label: 'View', icon: <Eye size={16} />, onSelect: () => onView(log) },
        { label: 'Edit', icon: <Pencil size={16} />, onSelect: () => onEdit(log) },
        { label: 'Delete', icon: <Trash2 size={16} />, danger: true, onSelect: () => onDelete(log) },
      ]}
    />
  )
  const head = (key: SortKey, label: string, right = false) => (
    <th className={`px-3 py-2 font-medium ${right ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1 hover:text-text">
        {label}
        {sort.key === key && (sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  )

  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            {head('date', 'Date')}
            <th className="px-3 py-2 text-left font-medium">Venue</th>
            {head('duration', 'Duration', true)}
            {head('audience', 'Audience', true)}
            {head('rating', 'Rating')}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="cursor-pointer border-b border-line hover:bg-white/[0.03]" onClick={() => onView(log)}>
              <td className="px-3 py-3">{formatDate(log.performed_at)} <span className="text-faint">{formatTime(log.performed_at)}</span></td>
              <td className="px-3 py-3">{log.venue_name}</td>
              <td className="px-3 py-3 text-right tabular">{clock(log.duration_seconds)}</td>
              <td className="px-3 py-3 text-right tabular">{log.audience_size}</td>
              <td className="px-3 py-3"><Stars n={log.rating} /></td>
              <td className="px-1" onClick={(e) => e.stopPropagation()}>{menu(log)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-2 md:hidden">
        {logs.map((log) => (
          <li key={log.id} className="flex items-center gap-2 rounded-2xl bg-panel py-2 pr-1 pl-4 ring-1 ring-line">
            <button type="button" onClick={() => onView(log)} className="min-w-0 flex-1 py-1 text-left">
              <p className="truncate font-medium">{log.venue_name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-faint">
                <span>{formatDate(log.performed_at)}</span>
                <span className="tabular">{clock(log.duration_seconds)}</span>
                <span>{log.audience_size} people</span>
                <Stars n={log.rating} />
              </p>
            </button>
            {menu(log)}
          </li>
        ))}
      </ul>
    </>
  )
}
