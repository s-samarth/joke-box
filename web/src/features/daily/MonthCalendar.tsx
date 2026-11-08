/**
 * A month of daily activity. Each day's box gets brighter the more you wrote, and a coloured dot
 * for each kind written that day: green jokes, periwinkle premises, orchid observations. When the
 * calendar is wide enough (desktop, iPad) each dot carries its count, wrapping onto a second line
 * if they don't fit; on a phone tap a day for its counts. Joke days have a brighter date, since
 * jokes alone keep the streak. Today is outlined in yellow; days to come are dimmed.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { formatDate } from '../../lib/time'
import { countLabel, countsOf, dayOf, heat, KIND_META, KINDS, monthName, totalOf, type Activity, type MonthSummary } from './activity'
import { monthWeeks, shiftMonth } from './dailyMath'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEAT = ['bg-ink-3/60', 'bg-paper/[0.07]', 'bg-paper/[0.12]', 'bg-paper/[0.18]', 'bg-paper/[0.26]']

interface Props {
  month: string
  onMonth: (m: string) => void
  activity: Activity
  summary: MonthSummary
  today: string
  selected: string | null
  onSelect: (day: string) => void
}

/** One day's box: the date top-left, the dots (and, when there's room, counts) along the bottom. */
function Day({ day, activity, today, selected, onSelect }: { day: string; activity: Activity; today: string; selected: boolean; onSelect: (d: string) => void }) {
  const counts = countsOf(dayOf(activity, day))
  const total = totalOf(counts)
  const future = day > today
  const said = total ? KINDS.filter((k) => counts[k]).map((k) => countLabel(k, counts[k])).join(', ') : 'nothing written'
  const label = `${formatDate(`${day}T12:00:00+05:30`)}: ${said}`
  const ring = selected ? 'ring-2 ring-paper' : day === today ? 'ring-2 ring-tape' : 'hover:ring-1 hover:ring-paper/30'
  return (
    <button type="button" disabled={future} onClick={() => onSelect(day)} title={future ? undefined : label} aria-label={label} aria-pressed={selected}
      className={`relative aspect-square rounded-lg text-sm transition ${future ? 'text-ink-4' : `${HEAT[heat(total)]} ${ring}`}`}>
      <span className={`absolute top-1 left-1.5 text-[11px] tabular ${counts.jokes ? 'font-semibold text-paper' : future ? '' : 'text-dim'}`}>{Number(day.slice(8))}</span>
      {total > 0 && (
        <span className="absolute inset-x-0.5 bottom-1.5 flex flex-wrap items-center justify-center gap-x-[3px] gap-y-0.5 @lg:gap-x-1.5">
          {KINDS.filter((k) => counts[k]).map((k) => (
            <span key={k} className="inline-flex items-center gap-0.5">
              <span className={`size-1.5 rounded-full @lg:size-[7px] ${KIND_META[k].dot}`} />
              <span className={`hidden text-[10px] leading-none font-semibold tabular @lg:inline ${KIND_META[k].text}`}>{counts[k]}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

export function MonthCalendar({ month, onMonth, activity, summary, today, selected, onSelect }: Props) {
  const weeks = monthWeeks(month)
  const { sofar, active, jokeDays } = summary

  return (
    <section className="@container rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{monthName(month)}</h2>
          <p className="text-sm text-dim">{sofar ? `${active} of ${sofar} days active · jokes on ${jokeDays}` : 'Still to come'}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={20} /></IconButton>
          <IconButton label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={20} /></IconButton>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEKDAYS.map((d) => <span key={d} className="text-xs text-faint">{d}</span>)}
        {weeks.flat().map((d, i) => d
          ? <Day key={d} day={d} activity={activity} today={today} selected={d === selected} onSelect={onSelect} />
          : <span key={i} />)}
      </div>
    </section>
  )
}
