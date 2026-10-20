/**
 * One row of filters that drives everything below it: the totals, the venue breakdown and the table.
 * Period and venue sit in the row because you change them most; the rest live in "More filters".
 */
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { NO_FILTERS, PERIODS, extraFilterCount, type LogFilters, type Period } from './logMath'

interface Props {
  value: LogFilters
  onChange: (f: LogFilters) => void
  venues: string[]
  onMore: () => void
}

export function ShowsToolbar({ value, onChange, venues, onMore }: Props) {
  const set = (c: Partial<LogFilters>) => onChange({ ...value, ...c })
  const toggleVenue = (v: string) => set({ venues: value.venues.includes(v) ? value.venues.filter((x) => x !== v) : [...value.venues, v] })
  const extra = extraFilterCount(value)
  const active = value.period !== 'all' || value.venues.length > 0 || extra > 0
  const venueLabel = value.venues.length === 0 ? 'All venues' : value.venues.length === 1 ? value.venues[0] : `${value.venues.length} venues`
  const venueItems: (MenuItem | 'divider')[] = [
    { label: 'All venues', checked: value.venues.length === 0, onSelect: () => set({ venues: [] }) },
    'divider',
    ...venues.map((v) => ({ label: v, checked: value.venues.includes(v), onSelect: () => toggleVenue(v) })),
  ]

  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      <div role="radiogroup" aria-label="Period" className="inline-flex shrink-0 rounded-lg bg-ink-3 p-0.5">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={value.period === p} onClick={() => set({ period: p })}
            className={`h-8 whitespace-nowrap rounded-md px-3 text-sm transition ${value.period === p ? 'bg-paper font-medium text-ink' : 'text-dim hover:text-paper'}`}>
            {PERIODS[p]}
          </button>
        ))}
      </div>
      <Dropdown align="start" items={venueItems} trigger={
        <button type="button" className={`inline-flex h-9 max-w-56 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition ${value.venues.length ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`}>
          <span className="truncate">{venueLabel}</span><ChevronDown size={14} className="shrink-0" />
        </button>
      } />
      <Button small variant={extra ? 'tape' : 'plain'} icon={<SlidersHorizontal size={15} />} onClick={onMore}>{extra ? `More filters (${extra})` : 'More filters'}</Button>
      {active && (
        <button type="button" onClick={() => onChange(NO_FILTERS)} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm text-dim hover:text-paper">
          <X size={14} /> Clear
        </button>
      )}
    </div>
  )
}
