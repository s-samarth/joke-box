/**
 * Every show as a table, like a Notion database. Click a column heading to sort by it (click again
 * to flip the order), click a row to open the show. On a phone the table scrolls sideways and the
 * date column stays pinned on the left.
 */
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { PerformanceLog } from '../../api/types'
import { Stars } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'
import type { Sort, SortKey } from './logMath'

interface Props {
  logs: PerformanceLog[]
  sort: Sort
  onSort: (key: SortKey) => void
  onOpen: (log: PerformanceLog) => void
  topicNames: (ids: string[]) => string
}

const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })
const pinned = 'sticky left-0 z-10 bg-ink group-hover:bg-ink-2'

function Heading({ k, label, sort, onSort, right, className = '' }: { k?: SortKey; label: string; sort: Sort; onSort: (k: SortKey) => void; right?: boolean; className?: string }) {
  const active = k === sort.key
  const Arrow = sort.desc ? ArrowDown : ArrowUp
  return (
    <th scope="col" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined} className={`px-3 py-2 font-normal whitespace-nowrap ${right ? 'text-right' : ''} ${className}`}>
      {k ? (
        <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 hover:text-paper ${active ? 'text-paper' : ''}`}>
          {label}{active && <Arrow size={13} />}
        </button>
      ) : label}
    </th>
  )
}

export function ShowsTable({ logs, sort, onSort, onOpen, topicNames }: Props) {
  const head = { sort, onSort }
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[760px] text-left text-[15px]">
        <thead className="border-b border-rule-strong text-sm text-dim">
          <tr>
            <Heading k="date" label="Date" className={pinned} {...head} />
            <Heading k="venue" label="Venue" {...head} />
            <Heading k="duration" label="On stage" right {...head} />
            <Heading k="audience" label="Crowd" right {...head} />
            <Heading k="rating" label="Rating" {...head} />
            <Heading label="Topics" {...head} />
            <Heading label="Remarks" {...head} />
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {logs.map((l) => (
            <tr key={l.id} onClick={() => onOpen(l)} className="group cursor-pointer hover:bg-ink-2">
              <td className={`${pinned} px-3 py-2.5 whitespace-nowrap`}>
                <button type="button" className="text-left tabular">{formatDate(l.performed_at)}</button>
                <span className="ml-2 text-sm text-faint">{weekday.format(new Date(l.performed_at))}</span>
              </td>
              <td className="max-w-48 truncate px-3 py-2.5">{l.venue_name}</td>
              <td className="tabular px-3 py-2.5 text-right">{clock(l.duration_seconds)}</td>
              <td className="tabular px-3 py-2.5 text-right">{l.audience_size || <span className="text-faint">–</span>}</td>
              <td className="px-3 py-2.5"><Stars rating={l.rating} /></td>
              <td className="max-w-52 truncate px-3 py-2.5 text-dim">{topicNames(l.topic_ids) || <span className="text-faint">–</span>}</td>
              <td className="max-w-72 truncate px-3 py-2.5 text-dim">{l.notes || <span className="text-faint">–</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
