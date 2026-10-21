/**
 * Shows per month, each column stacked by rating: dim gold at the bottom for rough nights, bright
 * gold on top for the best. The count sits on each column's cap; hover for the split.
 */
import { long } from '../../../lib/duration'
import type { Month } from './timelineMath'
import { TipBox } from './TipBox'
import { useTip, useWidth } from './useTip'
import { RATING_COLORS } from './vizColors'

const HEIGHT = 150

function split(m: Month): string[] {
  const parts = m.byRating.flatMap((n, i) => (n ? [`${n} at ${i + 1} star${i ? 's' : ''}`] : []))
  return [`${long(m.seconds)} on stage`, ...parts.reverse()]
}

export function MonthColumns({ data }: { data: Month[] }) {
  const { box, tip, on } = useTip()
  const { ref, width } = useWidth<HTMLDivElement>()
  const most = Math.max(1, ...data.map((m) => m.shows))
  const used = [1, 2, 3, 4, 5].filter((r) => data.some((m) => m.byRating[r - 1]))
  // Label as many months as fit at about 44px a name, evenly spaced, so they never collide.
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(width / 44))))

  return (
    <div ref={box} className="relative">
      <div className="flex items-end gap-1 border-b border-rule-strong sm:gap-2" style={{ height: HEIGHT + 22 }}>
        {data.map((m) => (
          <div key={m.key} {...(m.shows ? on(`${m.shows} show${m.shows === 1 ? '' : 's'} in ${m.label}`, split(m)) : {})}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-sm outline-none hover:bg-ink-3/50 focus-visible:ring-2 focus-visible:ring-tape">
            {m.shows > 0 && <span className="mb-1 text-xs tabular text-dim">{m.shows}</span>}
            <div className="flex w-full max-w-6 flex-col-reverse gap-[2px]" style={{ height: (m.shows / most) * HEIGHT }}>
              {m.byRating.map((n, i) => n > 0 && (
                <span key={i} className="w-full last:rounded-t-[4px]" style={{ flexGrow: n, background: RATING_COLORS[i] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div ref={ref} className="mt-1.5 flex gap-1 sm:gap-2">
        {data.map((m, i) => (
          <span key={m.key} className="flex min-w-0 flex-1 justify-center overflow-visible whitespace-nowrap text-[11px] text-faint">{i % every === 0 ? m.label : ''}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
        {used.map((r) => (
          <span key={r} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: RATING_COLORS[r - 1] }} />{r} star{r > 1 ? 's' : ''}</span>
        ))}
      </div>
      <TipBox tip={tip} />
    </div>
  )
}
