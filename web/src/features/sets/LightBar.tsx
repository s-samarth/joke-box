/**
 * Total time against the slot, read like an open mic's light: the host flashes it with a minute
 * to go. Tape-yellow while there's room, amber once you're inside the last minute, red when over.
 * Optional jokes don't count; their time is shown beside the total.
 */
import { clock } from '../../lib/duration'
import { lightState } from './setlistMath'

export function LightBar({ total, target, optional = 0, big = false }: { total: number; target: number; optional?: number; big?: boolean }) {
  const state = lightState(total, target)
  const fill = state === 'over' ? 'bg-light' : state === 'light' ? 'bg-amber' : 'bg-tape'
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0
  const lightAt = target > 60 ? ((target - 60) / target) * 100 : 0
  const note =
    state === 'over' ? `${clock(total - target)} over` : state === 'light' ? `Light's on, ${clock(target - total)} left` : `${clock(Math.max(0, target - total))} left`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`tabular ${big ? 'headline text-4xl' : 'text-lg font-medium'}`}>
          {clock(total)} <span className="text-base font-normal text-faint">of {clock(target)}{optional > 0 && `, +${clock(optional)} optional`}</span>
        </span>
        <span className={`text-sm ${state === 'over' ? 'text-light' : state === 'light' ? 'text-amber' : 'text-dim'}`}>{note}</span>
      </div>
      <div className="relative h-2 rounded-full bg-ink-4" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Set length">
        <div className={`h-full rounded-full transition-[width] ${fill}`} style={{ width: `${pct}%` }} />
        {lightAt > 0 && <span className="absolute -top-1 h-4 w-0.5 rounded bg-amber/80" style={{ left: `${lightAt}%` }} title="The light: one minute left" />}
      </div>
    </div>
  )
}
