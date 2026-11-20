/** The shows on the day you tapped in the show calendar: time, venue, length and stars. Tap one to open it. */
import type { PerformanceLog } from '../../../api/types'
import { Stars } from '../../../components/ui/pieces'
import { clock } from '../../../lib/duration'
import { formatDate, formatTime } from '../../../lib/time'
import { plural, secondsOf, stageTotal } from './showMonth'

export function ShowDayList({ day, shows, onOpen }: { day: string; shows: PerformanceLog[]; onOpen: (log: PerformanceLog) => void }) {
  return (
    <section aria-label="Shows on the day you picked">
      <h3 className="mb-1 font-semibold">
        {formatDate(`${day}T12:00:00+05:30`)}
        <span className="font-normal text-dim"> · {plural(shows.length, 'show')} · {stageTotal(secondsOf(shows))}</span>
      </h3>
      <ul className="divide-y divide-rule border-y border-rule">
        {shows.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => onOpen(l)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-ink-2/60">
              <span className="w-16 shrink-0 text-sm text-dim tabular">{formatTime(l.performed_at)}</span>
              <span className="min-w-0 flex-1 truncate">{l.venue_name}</span>
              <span className="shrink-0 text-sm text-dim tabular">{clock(l.duration_seconds)}</span>
              <Stars rating={l.rating} size={13} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
