/**
 * What's working: recent form up top (are you getting better?), then each topic's life month by
 * month, then the mix of rough, okay and great nights by topic, venue, set length and time slot.
 * Everything is worked out from your shows each time and follows the Shows filters.
 */
import { useMemo } from 'react'
import type { PerformanceLog, Topic } from '../../../api/types'
import { EmptyState } from '../../../components/ui/bits'
import { weightedRating } from '../logStats'
import { recentForm, topicGrid } from './formMath'
import { FormTiles } from './FormTiles'
import { byLength, bySlot, byTopic, byVenue, MIN_SHOWS } from './insightMath'
import { MixBars } from './MixBars'
import { months } from './timelineMath'
import { ChartCard } from './TipBox'
import { TopicGrid } from './TopicGrid'

export function InsightsView({ logs, topics }: { logs: PerformanceLog[]; topics: Topic[] }) {
  const data = useMemo(() => {
    const monthList = months(logs)
    return {
      form: recentForm(logs),
      months: monthList,
      grid: topicGrid(logs, topics, monthList.map((m) => m.key)),
      topic: byTopic(logs, topics), venue: byVenue(logs), length: byLength(logs), slot: bySlot(logs),
    }
  }, [logs, topics])
  if (!data.form) return <EmptyState title="No shows to read yet">Log a few shows, or widen the filters, and this fills in.</EmptyState>
  const usual = weightedRating(logs) ?? 0
  const note = `Best first. Your usual is ${usual.toFixed(1)} stars, weighted by stage time`

  return (
    <div className="space-y-4">
      <FormTiles form={data.form} />
      <ChartCard title="Topics over time" note="Each topic month by month, brighter for better nights, in the order you first did them">
        {data.grid.rows.length
          ? <TopicGrid rows={data.grid.rows} months={data.months} />
          : <p className="text-sm text-dim">No topic has {MIN_SHOWS} shows yet.</p>}
        {data.grid.thin.length > 0 && (
          <p className="mt-3 text-sm text-dim">Fewer than {MIN_SHOWS} shows, so not shown yet: {data.grid.thin.map((r) => `${r.label} (${r.shows})`).join(', ')}.</p>
        )}
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Topics" note={note}><MixBars data={data.topic} empty="No topic has enough shows yet." /></ChartCard>
        <ChartCard title="Venues" note={note}><MixBars data={data.venue} empty="No venue has enough shows yet." /></ChartCard>
        <ChartCard title="Set length" note="How long you were on"><MixBars data={data.length} empty="Not enough shows at any length yet." /></ChartCard>
        <ChartCard title="Time slot" note="When the show started (IST)"><MixBars data={data.slot} empty="Not enough shows in any slot yet." /></ChartCard>
      </div>
    </div>
  )
}
