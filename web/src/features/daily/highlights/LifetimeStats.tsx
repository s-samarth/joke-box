/**
 * The top of Activity: everything so far, all time, as six counts in two rows of three (jokes,
 * observations, premises; all writing, shows, stage time), in the same colours as the records shelf.
 */
import { useMemo } from 'react'
import { useLogs } from '../../../api/shows'
import { showsByDay } from '../../shows/insights/timelineMath'
import { useActivity } from '../useActivity'
import { lifetime, monthTotals } from './highlightMath'
import { MEASURES } from './measures'

export function LifetimeStats() {
  const { activity, today } = useActivity()
  const { data: logs = [] } = useLogs()
  const total = useMemo(() => lifetime(monthTotals(activity, showsByDay(logs), today)), [activity, logs, today])
  return (
    <section aria-label="All time" className="grid grid-cols-3 gap-2">
      {MEASURES.map((m) => (
        <div key={m.key} className="min-w-0 rounded-xl border border-rule bg-ink-2 p-3">
          <span className="flex items-center gap-1.5 truncate text-xs text-dim"><span className={`size-2 shrink-0 rounded-full ${m.dot}`} aria-hidden />{m.label}</span>
          <span className={`headline mt-1.5 block truncate text-[26px] tabular ${m.text}`}>{m.key === 'stage' ? m.say(total.stage) : total[m.key]}</span>
          <span className="block text-[11px] text-faint">all time</span>
        </div>
      ))}
    </section>
  )
}
