import { Clock, MapPin, Mic, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { long } from '../../lib/duration'
import type { stats } from './logMath'

function Card({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
      <p className="flex items-center gap-2 text-xs text-muted">{icon}{label}</p>
      <p className="mt-2 truncate font-display text-2xl font-semibold tabular">{value}</p>
    </div>
  )
}

/** The four totals. They follow whatever filters are active. */
export function StatsCards({ s }: { s: ReturnType<typeof stats> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={<Mic size={14} />} label="Total sets" value={String(s.totalSets)} />
      <Card icon={<Clock size={14} />} label="Stage time" value={long(s.stageSeconds)} />
      <Card icon={<Star size={14} />} label="Avg rating (by time)" value={s.rating === null ? '—' : `${s.rating.toFixed(1)} / 5`} />
      <Card icon={<MapPin size={14} />} label="Top venue" value={s.topVenue ?? '—'} />
    </div>
  )
}
