/**
 * Total time against the slot. The fill is red under 40% of the slot, yellow up to the full slot,
 * green once it's filled. Ticks mark 40% and 80%; a clear mark is the slot itself (100%).
 * A set can run long: the track keeps headroom past the 100% mark, and the excess shows there as
 * its own striped segment with "+m:ss over". Optional jokes don't count; their time is beside the total.
 */
import { clock } from '../../lib/duration'

/** Fill colour band for a share of the slot (1 = the full slot). */
const fillBand = (share: number): 'low' | 'mid' | 'full' => (share >= 1 ? 'full' : share >= 0.4 ? 'mid' : 'low')

const FILL = { low: 'bg-light', mid: 'bg-tape', full: 'bg-ok' } as const
const TEXT = { low: 'text-dim', mid: 'text-dim', full: 'text-ok' } as const

export function LightBar({ total, target, optional = 0, big = false }: { total: number; target: number; optional?: number; big?: boolean }) {
  const share = target > 0 ? total / target : 0
  const band = fillBand(share)
  const over = target > 0 && total > target
  // The track runs to 120% of the slot, or further if the set is longer, so 100% never sits at the end.
  const span = Math.max(1.2, share)
  const at = (s: number) => `${(s / span) * 100}%`
  const note = target <= 0 ? '' : over ? `+${clock(total - target)} over` : total === target ? 'Right on time' : `${clock(target - total)} left`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`tabular ${big ? 'headline text-4xl' : 'text-lg font-medium'}`}>
          {clock(total)} <span className="text-base font-normal text-faint">of {clock(target)}{optional > 0 && `, +${clock(optional)} optional`}</span>
        </span>
        <span className={`tabular text-sm ${over ? 'font-medium text-ok' : TEXT[band]}`}>{note}</span>
      </div>
      <div
        className="relative h-3.5 rounded-full bg-ink-4"
        role="progressbar"
        aria-valuenow={Math.round(share * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${clock(total)} of ${clock(target)}${note ? `, ${note}` : ''}`}
        aria-label="Set length"
      >
        <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] ${FILL[band]}`} style={{ width: at(Math.min(share, 1)) }} />
        {over && (
          <div
            className="absolute inset-y-0 rounded-r-full bg-ok/60 bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgb(0_0_0/0.25)_4px_8px)]"
            style={{ left: at(1), width: at(share - 1) }}
            title={`${clock(total - target)} over the slot`}
          />
        )}
        {[0.4, 0.8].map((s) => (
          <span key={s} className="absolute inset-y-0.5 w-px bg-white/25" style={{ left: at(s) }} title={`${s * 100}% of the slot`} />
        ))}
        <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded bg-white/80" style={{ left: at(1) }} title="The full slot" />
      </div>
    </div>
  )
}
