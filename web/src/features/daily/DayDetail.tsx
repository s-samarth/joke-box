/**
 * The day you tapped on the calendar (today to begin with): four counts, observations, premises
 * and jokes written, and minutes on stage with its shows as tally marks. Counts only: the pieces
 * themselves live in their lists. On a phone this is where a day's numbers live, since a day's
 * box only has room for dots.
 */
import { formatDate } from '../../lib/time'
import { plural, secondsOf, type ShowDays } from '../shows/calendar/showMonth'
import { countsOf, KIND_META, KINDS, totalOf, type DayActivity, type Kind } from './activity'
import { Tally } from './Tally'

const label = (k: Kind) => KIND_META[k].many[0].toUpperCase() + KIND_META[k].many.slice(1)

function Tile({ dot, name, children }: { dot: string; name: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-dim sm:text-sm">
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{name}</span>
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

export function DayDetail({ date, today, day, stage }: { date: string; today: string; day: DayActivity; stage: ShowDays }) {
  const counts = countsOf(day)
  const total = totalOf(counts)
  const shows = stage.get(date) ?? []
  const minutes = Math.round(secondsOf(shows) / 60)
  const isToday = date === today
  const said = [total ? `${total} written` : 'nothing written', ...(shows.length ? [plural(shows.length, 'show')] : [])].join(' · ')

  return (
    <section aria-label="The day you picked">
      <h2 className="mb-2.5 font-semibold">
        {isToday ? 'Today' : formatDate(`${date}T12:00:00+05:30`)}
        <span className="font-normal text-dim"> · {said}</span>
      </h2>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border border-rule bg-ink-2 p-3.5 min-[480px]:grid-cols-4 sm:p-4">
        {KINDS.map((k) => (
          <Tile key={k} dot={KIND_META[k].dot} name={label(k)}>
            <span className={`headline text-[28px] tabular ${counts[k] ? KIND_META[k].text : 'text-faint'}`}>{counts[k]}</span>
          </Tile>
        ))}
        <Tile dot="bg-tape" name="On stage">
          <span className={`headline text-[28px] tabular ${minutes ? 'text-tape' : 'text-faint'}`}>{minutes}<span className="text-base">m</span></span>
          {shows.length > 0 && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-dim"><Tally count={shows.length} height={12} />{plural(shows.length, 'show')}</span>
          )}
        </Tile>
      </dl>
    </section>
  )
}
