/**
 * A diary of mics, one square per day, one row of weeks per year. Days you performed are gold,
 * brighter for better nights (two shows in a day average out); hover or focus a day for its shows.
 * Wider than a phone, so it scrolls sideways inside its card.
 */
import type { PerformanceLog } from '../../../api/types'
import { clock } from '../../../lib/duration'
import { formatTime, todayIst } from '../../../lib/time'
import { weightedRating } from '../logStats'
import type { CalendarYear } from './timelineMath'
import { TipBox } from './TipBox'
import { useTip } from './useTip'
import { RATING_COLORS, ratingColor } from './vizColors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const dayTitle = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const showLine = (l: PerformanceLog) => `${formatTime(l.performed_at)} ${l.venue_name}: ${l.rating} stars, ${clock(l.duration_seconds)}`

function Year({ data, days, today }: { data: CalendarYear; days: Map<string, PerformanceLog[]>; today: string }) {
  const { box, tip, on } = useTip()
  const count = data.weeks.flat().reduce((n, d) => n + (d ? days.get(d)?.length ?? 0 : 0), 0)
  // A month's name goes over the first week that contains its 1st.
  const label = (week: (string | null)[]) => {
    const first = week.find((d) => d?.endsWith('-01'))
    return first ? MONTHS[Number(first.slice(5, 7)) - 1] : ''
  }
  return (
    <div>
      <p className="mb-2 text-sm"><span className="font-semibold">{data.year}</span> <span className="text-dim">{count} show{count === 1 ? '' : 's'}</span></p>
      <div ref={box} className="relative">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-[3px]">
            <div className="mr-1 flex flex-col gap-[3px] pt-[18px]">
              {DAYS.map((d, i) => <span key={i} className="h-[11px] text-[10px] leading-[11px] text-faint">{d}</span>)}
            </div>
            {data.weeks.map((week, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                <span className="h-[15px] w-[11px] overflow-visible whitespace-nowrap text-[10px] text-faint">{label(week)}</span>
                {week.map((d, i) => {
                  const shows = d ? days.get(d) : undefined
                  if (!d) return <span key={i} className="size-[11px]" />
                  // Days still to come are outlined, so they don't read as days off.
                  if (!shows) return <span key={i} className={`size-[11px] rounded-[2px] ${d > today ? 'border border-ink-3' : 'bg-ink-3'}`} />
                  return (
                    <span key={i} {...on(dayTitle(d), shows.map(showLine))} aria-label={`${dayTitle(d)}: ${shows.length} show${shows.length === 1 ? '' : 's'}`}
                      className="relative size-[11px] rounded-[2px] outline-none hover:ring-2 hover:ring-paper/60 focus-visible:ring-2 focus-visible:ring-tape"
                      style={{ background: ratingColor(weightedRating(shows) ?? 3) }}>
                      {shows.length > 1 && <span className="absolute inset-[3.5px] rounded-full bg-ink/70" />}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <TipBox tip={tip} />
      </div>
    </div>
  )
}

export function MicCalendar({ years, days }: { years: CalendarYear[]; days: Map<string, PerformanceLog[]> }) {
  const today = todayIst()
  return (
    <div className="space-y-5">
      {years.map((y) => <Year key={y.year} data={y} days={days} today={today} />)}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="flex items-center gap-1.5">Rough<span className="flex gap-[2px]">{RATING_COLORS.map((c) => <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />)}</span>Great</span>
        <span className="flex items-center gap-1.5"><span className="relative size-2.5 rounded-[2px]" style={{ background: RATING_COLORS[2] }}><span className="absolute inset-[3px] rounded-full bg-ink/70" /></span>More than one show that day</span>
      </div>
    </div>
  )
}
