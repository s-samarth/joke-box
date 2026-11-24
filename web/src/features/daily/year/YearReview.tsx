/**
 * The year review's way in, at the foot of Activity: this year so far on a strip of tape with how
 * far through the year you are, and every past year with anything in it, wrapped. Opening one
 * plays its cards (YearStories). The current year's wrap is "so far" until 31 December is over.
 */
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useJokes, useTopics } from '../../../api/library'
import { useLogs } from '../../../api/shows'
import { topicName } from '../../../lib/jokeMeta'
import { useUses } from '../../observations/useUsed'
import { showsByDay } from '../../shows/insights/timelineMath'
import { useActivity } from '../useActivity'
import { storiesFor } from './storyCards'
import { themeFor } from './themes'
import { activeYears, yearStats } from './yearStats'
import { YearStories } from './YearStories'

export function YearReview() {
  const { activity, today } = useActivity()
  const { data: logs = [] } = useLogs()
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const uses = useUses()
  const [open, setOpen] = useState<number | null>(null)
  const stage = useMemo(() => showsByDay(logs), [logs])
  const years = activeYears(activity, stage, today)
  const [current, ...past] = years
  const stats = (year: number) => yearStats(year, {
    activity, stage, used: uses.used, today,
    built: new Set(jokes.map((j) => j.premise_id).filter((id): id is string => Boolean(id))),
    topicName: (id) => topicName(topics.find((t) => t.id === id)) || 'Random',
  })
  const now = stats(current)
  const shown = open === null ? null : stats(open)

  return (
    <section aria-label="Year in review">
      <div className="rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
        <button type="button" onClick={() => setOpen(current)} className="flex w-full items-center gap-4 text-left">
          <span className="tape shrink-0 px-3 py-1.5 text-[17px] sm:px-3.5 sm:text-[19px]" style={{ '--tilt': '-2deg' } as React.CSSProperties}>{current} so far</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">How this year is going</span>
            <span className="block text-[13px] text-dim">{storiesFor(now, themeFor(current)).length} cards · the full wrap opens on 1 January</span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-tape" aria-hidden />
        </button>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="h-1.5 min-w-32 flex-1 overflow-hidden rounded-full bg-ink-3" aria-hidden>
            <span className="block h-full rounded-full bg-tape" style={{ width: `${(now.daysCounted / now.daysIn) * 100}%` }} />
          </div>
          <span className="text-xs text-dim tabular">{now.daysCounted} of {now.daysIn} days</span>
          {past.map((y) => (
            <button key={y} type="button" onClick={() => setOpen(y)} className="inline-flex min-h-9 items-center rounded-full bg-ink-3 px-3 text-[13px] hover:bg-ink-4">{y} wrapped</button>
          ))}
        </div>
      </div>
      {shown && open !== null && (
        <YearStories title={shown.sofar ? `${open} so far` : `${open} wrapped`} stories={storiesFor(shown, themeFor(open))} theme={themeFor(open)} onClose={() => setOpen(null)} />
      )}
    </section>
  )
}
