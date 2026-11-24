/**
 * A month of activity in one card: the month and how many days were active, the month's stage
 * time big in gold with a tally of its shows, the month's writing split by kind (MonthMix, which
 * is also the colour key), then the days. Each day's box gets brighter the more you wrote, with a
 * dot for each kind written that day (orchid observations, periwinkle premises, green jokes) and
 * a gold dot for every show you did. When the calendar is wide enough (laptop, iPad) each dot
 * carries its count and the stage dots the minutes; on a phone tap a day for its counts. Joke days
 * have a brighter date, since jokes alone keep the streak. Today is outlined in yellow.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { formatDate } from '../../lib/time'
import { dayMinutes, plural, secondsOf, stageTotal, type MonthStats, type ShowDays } from '../shows/calendar/showMonth'
import { countLabel, countsOf, dayOf, heat, KIND_META, KINDS, monthName, totalOf, type Activity, type MonthSummary } from './activity'
import { monthWeeks, shiftMonth } from './dailyMath'
import { MonthMix } from './MonthMix'
import { Tally } from './Tally'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEAT = ['bg-ink-3/60', 'bg-paper/[0.07]', 'bg-paper/[0.12]', 'bg-paper/[0.18]', 'bg-paper/[0.26]']
/** More shows than this in a day still draw this many dots; the label says the rest. */
const PIPS = 3

interface Props {
  month: string
  onMonth: (m: string) => void
  activity: Activity
  summary: MonthSummary
  stage: ShowDays
  stageMonth: MonthStats
  today: string
  selected: string | null
  onSelect: (day: string) => void
}

function Day({ day, activity, stage, today, selected, onSelect }: { day: string; activity: Activity; stage: ShowDays; today: string; selected: boolean; onSelect: (d: string) => void }) {
  const counts = countsOf(dayOf(activity, day))
  const total = totalOf(counts)
  const shows = stage.get(day) ?? []
  const future = day > today
  const said = [...KINDS.filter((k) => counts[k]).map((k) => countLabel(k, counts[k])), ...(shows.length ? [`${plural(shows.length, 'show')}, ${stageTotal(secondsOf(shows))} on stage`] : [])]
  const label = `${formatDate(`${day}T12:00:00+05:30`)}: ${said.length ? said.join(', ') : 'nothing written'}`
  const ring = selected ? 'ring-2 ring-paper' : day === today ? 'ring-2 ring-tape' : 'hover:ring-1 hover:ring-paper/30'
  return (
    <button type="button" disabled={future} onClick={() => onSelect(day)} title={future ? undefined : label} aria-label={label} aria-pressed={selected}
      className={`relative aspect-square rounded-lg text-sm transition ${future ? 'text-ink-4' : `${HEAT[heat(total)]} ${ring}`}`}>
      <span className={`absolute top-1 left-1.5 text-[11px] tabular @lg:text-xs ${counts.jokes ? 'font-semibold text-paper' : future ? '' : 'text-dim'}`}>{Number(day.slice(8))}</span>
      {(total > 0 || shows.length > 0) && (
        <span className="absolute inset-x-0.5 bottom-1.5 flex flex-wrap items-center justify-center gap-x-[3px] gap-y-0.5 @lg:bottom-2 @lg:gap-x-1.5">
          {KINDS.filter((k) => counts[k]).map((k) => (
            <span key={k} className="inline-flex items-center gap-0.5">
              <span className={`size-1.5 rounded-full @lg:size-[7px] ${KIND_META[k].dot}`} />
              <span className={`hidden text-[10px] leading-none font-semibold tabular @lg:inline ${KIND_META[k].text}`}>{counts[k]}</span>
            </span>
          ))}
          {shows.length > 0 && (
            <span className="inline-flex items-center gap-[2px]">
              {shows.slice(0, PIPS).map((s) => <span key={s.id} className="size-1.5 rounded-full bg-tape @lg:size-[7px]" />)}
              <span className="hidden pl-0.5 text-[10px] leading-none font-semibold text-tape tabular @lg:inline">{dayMinutes(secondsOf(shows))}</span>
            </span>
          )}
        </span>
      )}
    </button>
  )
}

/** The month's time on stage, big, with its shows as tally marks: under the month on a phone, beside it when there's room. */
function StageFigure({ stats }: { stats: MonthStats }) {
  if (!stats.shows) return null
  return (
    <div className="flex shrink-0 items-center gap-3 @md:block @md:text-right" aria-label={`${stageTotal(stats.seconds)} on stage, ${plural(stats.shows, 'show')}`}>
      <p className="headline text-[34px] leading-none text-tape tabular @md:text-[40px]">{stageTotal(stats.seconds)}</p>
      <p className="flex items-center gap-2 text-[13px] @md:mt-1.5 @md:justify-end">
        <Tally count={stats.shows} />
        <span><b className="font-semibold tabular">{stats.shows}</b> <span className="text-dim">{stats.shows === 1 ? 'show' : 'shows'}</span></span>
      </p>
    </div>
  )
}

export function MonthCalendar({ month, onMonth, activity, summary, stage, stageMonth, today, selected, onSelect }: Props) {
  const weeks = monthWeeks(month)
  const { sofar, active, jokeDays } = summary

  return (
    <section className="@container rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <div className="flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-0.5">
            <h2 className="mr-1 text-lg font-semibold whitespace-nowrap">{monthName(month)}</h2>
            <IconButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></IconButton>
            <IconButton label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></IconButton>
          </div>
          <p className="text-sm text-dim">{sofar ? `${active} of ${sofar} days active · jokes on ${jokeDays}` : 'Still to come'}</p>
        </div>
        <StageFigure stats={stageMonth} />
      </div>
      <div className="mt-4"><MonthMix month={month} today={today} summary={summary} micNights={stageMonth.days} /></div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEKDAYS.map((d) => <span key={d} className="text-xs text-faint">{d}</span>)}
        {weeks.flat().map((d, i) => d
          ? <Day key={d} day={d} activity={activity} stage={stage} today={today} selected={d === selected} onSelect={onSelect} />
          : <span key={i} />)}
      </div>
    </section>
  )
}
