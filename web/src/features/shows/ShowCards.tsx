/**
 * Every show as a list, for a phone: the date and stars on top, then the venue, time on stage and
 * crowd, so how a night went reads without scrolling sideways. Tap one to open it. The Sort menu
 * does what the table's headings do on a wider screen (ShowsTable).
 */
import type { PerformanceLog } from '../../api/types'
import { Dropdown } from '../../components/ui/Menu'
import { Stars } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'
import { MenuButton } from '../jokes/JokeFilters'
import { weekday, type Sort } from './logMath'

interface Props {
  logs: PerformanceLog[]
  sort: Sort
  onSort: (sort: Sort) => void
  onOpen: (log: PerformanceLog) => void
  topicNames: (ids: string[]) => string
}

const SORTS: { label: string; sort: Sort }[] = [
  { label: 'Newest', sort: { key: 'date', desc: true } },
  { label: 'Oldest', sort: { key: 'date', desc: false } },
  { label: 'Best rated', sort: { key: 'rating', desc: true } },
  { label: 'Lowest rated', sort: { key: 'rating', desc: false } },
  { label: 'Longest on stage', sort: { key: 'duration', desc: true } },
  { label: 'Biggest crowd', sort: { key: 'audience', desc: true } },
  { label: 'Venue, A to Z', sort: { key: 'venue', desc: false } },
]

const same = (a: Sort, b: Sort) => a.key === b.key && a.desc === b.desc

export function ShowCards({ logs, sort, onSort, onOpen, topicNames }: Props) {
  const current = SORTS.find((s) => same(s.sort, sort))
  const items = SORTS.map((s) => ({ label: s.label, checked: same(s.sort, sort), onSelect: () => onSort(s.sort) }))
  return (
    <div className="sm:hidden">
      <Dropdown align="start" items={items} trigger={<span><MenuButton label={current?.label ?? 'Sort'} on={false} /></span>} />
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {logs.map((l) => {
          const more = [topicNames(l.topic_ids), l.notes].filter(Boolean).join(' · ')
          return (
            <li key={l.id}>
              <button type="button" onClick={() => onOpen(l)} className="block w-full py-3 text-left active:bg-ink-2">
                <span className="flex items-center justify-between gap-3">
                  <span className="tabular">{formatDate(l.performed_at)}<span className="ml-2 text-sm text-faint">{weekday.format(new Date(l.performed_at))}</span></span>
                  <Stars rating={l.rating} size={15} />
                </span>
                <span className="mt-1 flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="min-w-0 truncate">{l.venue_name}</span>
                  <span className="tabular shrink-0 text-dim">{clock(l.duration_seconds)}{l.audience_size ? ` · ${l.audience_size} people` : ''}</span>
                </span>
                {more && <span className="mt-1 block truncate text-sm text-dim">{more}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
