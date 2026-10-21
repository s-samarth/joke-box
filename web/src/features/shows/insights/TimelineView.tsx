/**
 * Your shows over time: the mic diary first (how often you go up, and the gaps), then shows per
 * month by rating, then whether your rating is climbing. Follows the Shows filters.
 */
import { useMemo } from 'react'
import type { PerformanceLog } from '../../../api/types'
import { EmptyState } from '../../../components/ui/bits'
import { weightedRating } from '../logStats'
import { MicCalendar } from './MicCalendar'
import { MonthColumns } from './MonthColumns'
import { calendarYears, months, showsByDay, trend } from './timelineMath'
import { ChartCard } from './TipBox'
import { TrendLine } from './TrendLine'

const WINDOW = 10

export function TimelineView({ logs }: { logs: PerformanceLog[] }) {
  const data = useMemo(() => ({ years: calendarYears(logs), days: showsByDay(logs), months: months(logs), trend: trend(logs, WINDOW) }), [logs])
  if (!logs.length) return <EmptyState title="No shows to plot yet">Log a few shows, or widen the filters, and your timeline fills in.</EmptyState>
  return (
    <div className="space-y-4">
      <ChartCard title="Mic diary" note="Every day you went up, brighter for better nights">
        <MicCalendar years={data.years} days={data.days} />
      </ChartCard>
      <ChartCard title="Shows per month" note="Split by rating, best on top">
        <MonthColumns data={data.months} />
      </ChartCard>
      <ChartCard title="Rating trend" note={`Your rating over your last ${WINDOW} shows, after every show`}>
        {data.trend.length > 1
          ? <TrendLine data={data.trend} usual={weightedRating(logs) ?? 3} window={WINDOW} />
          : <p className="text-sm text-dim">The trend starts after your fifth show.</p>}
      </ChartCard>
    </div>
  )
}
