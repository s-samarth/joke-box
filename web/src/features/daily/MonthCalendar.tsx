/**
 * A month of the habit: every day you added a joke gets a green tick (with a count when there were
 * several). Today is outlined in yellow; days to come are dimmed. Tap a day to see its jokes.
 */
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Bit } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { monthWeeks, shiftMonth } from './dailyMath'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

interface Props {
  month: string
  onMonth: (m: string) => void
  days: Map<string, Bit[]>
  today: string
  selected: string | null
  onSelect: (day: string) => void
}

export function MonthCalendar({ month, onMonth, days, today, selected, onSelect }: Props) {
  const weeks = monthWeeks(month)
  const inMonth = weeks.flat().filter((d): d is string => Boolean(d))
  const sofar = inMonth.filter((d) => d <= today)
  const written = sofar.filter((d) => days.has(d)).length

  return (
    <section className="rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{monthName(month)}</h2>
          <p className="text-sm text-dim">{sofar.length ? `${written} of ${sofar.length} days with a new joke` : 'Still to come'}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={20} /></IconButton>
          <IconButton label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={20} /></IconButton>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEKDAYS.map((d) => <span key={d} className="text-xs text-faint">{d}</span>)}
        {weeks.flat().map((d, i) => {
          if (!d) return <span key={i} />
          const count = days.get(d)?.length ?? 0
          const future = d > today
          const ring = d === selected ? 'ring-2 ring-paper' : d === today ? 'ring-2 ring-tape' : count ? 'ring-1 ring-ok/40' : ''
          return (
            <button key={d} type="button" disabled={future} onClick={() => onSelect(d)}
              aria-label={`${d}: ${count ? `${count} new joke${count === 1 ? '' : 's'}` : 'no new jokes'}`} aria-pressed={d === selected}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${ring} ${count ? 'bg-ok/15 text-paper hover:bg-ok/25' : future ? 'text-ink-4' : 'bg-ink-3/60 text-dim hover:text-paper'}`}>
              <span className="absolute top-1 left-1.5 text-[11px] tabular">{Number(d.slice(8))}</span>
              {count > 0 && <Check size={20} strokeWidth={3} className="text-ok" />}
              {count > 1 && <span className="absolute right-1.5 bottom-1 text-[10px] font-semibold text-ok">{count}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
