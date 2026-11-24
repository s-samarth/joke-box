/**
 * The last 12 months as a grid of days (like GitHub's contribution graph): a column a week,
 * greener the more you wrote, your three biggest days in gold.
 */
import { formatDate } from '../../../lib/time'
import type { GridCell } from './highlightMath'
import { longMonth } from './measures'

const shade = (n: number) => (n <= 0 ? 'bg-ink-3' : n === 1 ? 'bg-ok/25' : n <= 3 ? 'bg-ok/45' : n <= 6 ? 'bg-ok/70' : 'bg-ok')

/** A month's name over the week it starts in, when there's room since the last one. */
function monthLabels(weeks: GridCell[][]): (string | null)[] {
  const labels: (string | null)[] = []
  let last = -4
  weeks.forEach((w, i) => {
    const first = w.find((c) => c.day.endsWith('-01'))
    if (first && i - last >= 4) {
      last = i
      labels.push(longMonth(first.day.slice(0, 7)).slice(0, 3))
    } else labels.push(null)
  })
  return labels
}

export function YearGrid({ weeks, top }: { weeks: GridCell[][]; top: Set<string> }) {
  const labels = monthLabels(weeks)
  const biggest = [...top].sort().map((d) => formatDate(`${d}T12:00:00+05:30`)).join(', ')
  return (
    <div className="rounded-xl border border-rule bg-ink-2 p-3">
      <div className="grid grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] gap-[2px] text-[10px] text-faint" aria-hidden>
        {labels.map((l, i) => <span key={i} className="col-span-1 overflow-visible whitespace-nowrap">{l ?? ''}</span>)}
      </div>
      <div role="img" aria-label={`Days written in the last 12 months. Your biggest: ${biggest || 'none yet'}.`}
        className="mt-1 grid grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] grid-rows-7 gap-[2px]">
        {weeks.flat().map((c) => (
          <span key={c.day} title={c.future ? undefined : `${formatDate(`${c.day}T12:00:00+05:30`)}: ${c.total} written`}
            className={`aspect-square rounded-[1.5px] ${c.future ? 'bg-transparent' : top.has(c.day) ? 'bg-tape' : shade(c.total)}`} />
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-dim"><span className="size-2 rounded-[2px] bg-tape" aria-hidden />Your three biggest days</p>
    </div>
  )
}
