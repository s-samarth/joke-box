/**
 * A month of shows, laid out like the Daily activity calendar but in stage gold. A day you went
 * up is tinted gold, deeper the longer you were on stage, with its minutes along the bottom and a
 * dot per show (in the corner when the calendar is wide, above the minutes on a phone). Tap a show day to list its shows. Today is outlined in yellow; days
 * to come are dimmed.
 */
import { ChevronLeft, ChevronRight, Mic } from 'lucide-react'
import { IconButton } from '../../../components/ui/Button'
import { formatDate } from '../../../lib/time'
import { monthName } from '../../daily/activity'
import { monthWeeks, shiftMonth } from '../../daily/dailyMath'
import { dayMinutes, monthLine, monthStats, plural, secondsOf, stageHeat, type ShowDays } from './showMonth'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GOLD = ['', 'bg-tape/[0.13]', 'bg-tape/[0.22]', 'bg-tape/[0.32]', 'bg-tape/[0.45]']
const MAX_DOTS = 3

interface Props {
  month: string
  onMonth: (m: string) => void
  days: ShowDays
  today: string
  selected: string | null
  onSelect: (day: string | null) => void
}

/** One day's box. Only days with shows are buttons; the rest are just the date. */
function Day({ day, days, today, selected, onSelect }: { day: string; days: ShowDays; today: string; selected: boolean; onSelect: Props['onSelect'] }) {
  const shows = days.get(day)
  const date = Number(day.slice(8))
  const outline = day === today ? 'ring-2 ring-tape' : ''
  if (!shows) {
    const future = day > today
    return (
      <span className={`relative aspect-square rounded-lg @2xl:aspect-[5/3] ${future ? '' : `bg-ink-3/60 ${outline}`}`}>
        <span className={`absolute top-1 left-1.5 text-[11px] tabular ${future ? 'text-ink-4' : 'text-dim'}`}>{date}</span>
      </span>
    )
  }
  const seconds = secondsOf(shows)
  const heat = stageHeat(seconds)
  const label = `${formatDate(`${day}T12:00:00+05:30`)}: ${plural(shows.length, 'show')}, ${dayMinutes(seconds).replace('m', ' min')} on stage`
  const ring = selected ? 'ring-2 ring-paper' : outline || 'hover:ring-1 hover:ring-tape/50'
  return (
    <button type="button" onClick={() => onSelect(selected ? null : day)} title={label} aria-label={label} aria-pressed={selected}
      className={`relative aspect-square rounded-lg transition @2xl:aspect-[5/3] ${GOLD[heat]} ${ring}`}>
      <span className="absolute top-1 left-1.5 text-[11px] font-semibold text-paper tabular">{date}</span>
      {/* On a phone the dots sit centred between the date and the minutes; with room, in the corner. */}
      <span aria-hidden className="absolute inset-x-0 top-[42%] flex items-center justify-center gap-[2px] @lg:inset-x-auto @lg:top-1.5 @lg:right-1.5">
        {shows.slice(0, MAX_DOTS).map((s) => <span key={s.id} className="size-1 rounded-full bg-tape @lg:size-[5px]" />)}
        {shows.length > MAX_DOTS && <span className="text-[9px] leading-none font-semibold text-tape">+</span>}
      </span>
      <span className={`absolute inset-x-0 bottom-1 text-[11px] font-semibold tabular @lg:bottom-1.5 @lg:text-sm ${heat >= 3 ? 'text-paper' : 'text-tape'}`}>
        {dayMinutes(seconds)}
      </span>
    </button>
  )
}

export function ShowCalendar({ month, onMonth, days, today, selected, onSelect }: Props) {
  const weeks = monthWeeks(month)

  return (
    <section aria-label="Show calendar" className="@container rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic size={18} className="shrink-0 text-tape" />{monthName(month)}</h2>
          <p className="text-sm text-dim">{monthLine(monthStats(days, month))}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={20} /></IconButton>
          <IconButton label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={20} /></IconButton>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEKDAYS.map((d) => <span key={d} className="text-xs text-faint">{d}</span>)}
        {weeks.flat().map((d, i) => d
          ? <Day key={d} day={d} days={days} today={today} selected={d === selected} onSelect={onSelect} />
          : <span key={i} />)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="flex items-center gap-1.5">Fewer minutes<span className="flex gap-[2px]">{GOLD.slice(1).map((g) => <span key={g} className={`size-2.5 rounded-[2px] ${g}`} />)}</span>More</span>
        <span className="flex items-center gap-1.5"><span className="flex gap-[2px]"><span className="size-[5px] rounded-full bg-tape" /><span className="size-[5px] rounded-full bg-tape" /></span>A dot per show</span>
      </div>
    </section>
  )
}
