/**
 * Where you're strong and where to work: a few plain sentences up top, then the evidence, with
 * topics, venues, set lengths and time slots each compared with your own usual rating. Everything
 * follows the Shows filters, so pick a period to see how a stretch went.
 */
import type { PerformanceLog, Topic } from '../../../api/types'
import { EmptyState } from '../../../components/ui/bits'
import { weightedRating } from '../logStats'
import { DeltaBars } from './DeltaBars'
import { byLength, bySlot, byTopic, byVenue, extremes, MIN_SHOWS, type Group } from './insightMath'
import { ChartCard } from './TipBox'
import { ABOVE, BELOW, signed } from './vizColors'

const fact = (g: Group) => `${g.rating.toFixed(1)} stars over ${g.shows} shows, ${signed(g.delta)} on your usual`
const pct = (n: number, of: number) => `${Math.round((n / of) * 100)}%`

function Summary({ title, color, lines }: { title: string; color: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5" style={{ borderTop: `3px solid ${color}` }}>
      <h3 className="text-base font-semibold">{title}</h3>
      {lines.length ? (
        <ul className="mt-2 space-y-2 text-[15px]">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      ) : (
        <p className="mt-2 text-sm text-dim">Nothing stands out yet. Patterns show up once a topic, venue or slot has {MIN_SHOWS} or more shows.</p>
      )}
    </div>
  )
}

export function InsightsView({ logs, topics }: { logs: PerformanceLog[]; topics: Topic[] }) {
  if (!logs.length) return <EmptyState title="No shows to read yet">Log a few shows, or widen the filters, and this fills in.</EmptyState>
  const usual = weightedRating(logs) ?? 0
  const [topic, venue, length, slot] = [byTopic(logs, topics), byVenue(logs), byLength(logs), bySlot(logs)]
  const [t, v, len, s] = [topic, venue, length, slot].map((b) => extremes(b))
  const strong = [
    t.best && `${t.best.label} is your strongest topic: ${fact(t.best)}.`,
    v.best && `${v.best.label} is your best room: ${fact(v.best)}.`,
    len.best && `Sets of ${len.best.label} go best: ${fact(len.best)}.`,
    s.best && `The ${s.best.label} slot goes best: ${fact(s.best)}.`,
  ].filter((x): x is string => Boolean(x))
  const work = [
    t.worst && `${t.worst.label} lands below your usual: ${fact(t.worst)}.`,
    v.worst && `${v.worst.label} has been a tough room: ${fact(v.worst)}.`,
    len.worst && `Sets of ${len.worst.label} go worst: ${fact(len.worst)}.`,
    s.worst && `The ${s.worst.label} slot goes worst: ${fact(s.worst)}.`,
  ].filter((x): x is string => Boolean(x))
  const great = logs.filter((l) => l.rating >= 4).length
  const rough = logs.filter((l) => l.rating <= 2).length
  const note = `Against your usual ${usual.toFixed(1)} stars, weighted by stage time`

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-dim">
        <span className="text-paper">{pct(great, logs.length)}</span> of these shows got 4 stars or more and{' '}
        <span className="text-paper">{pct(rough, logs.length)}</span> got 2 or less.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Summary title="Strengths" color={ABOVE} lines={strong} />
        <Summary title="Work on" color={BELOW} lines={work} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Topics" note={note}><DeltaBars data={topic} empty="No topics are ticked on these shows." /></ChartCard>
        <ChartCard title="Venues" note={note}><DeltaBars data={venue} empty="No venue has enough shows yet." /></ChartCard>
        <ChartCard title="Set length" note="How long you were on, against your usual"><DeltaBars data={length} empty="Not enough shows at any length yet." /></ChartCard>
        <ChartCard title="Time slot" note="When the show started (IST), against your usual"><DeltaBars data={slot} empty="Not enough shows in any slot yet." /></ChartCard>
      </div>
    </div>
  )
}
