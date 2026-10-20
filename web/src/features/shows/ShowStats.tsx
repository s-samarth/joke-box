/** Four totals for whatever is filtered: pick a period or venue in the toolbar and they follow. */
import type { PerformanceLog } from '../../api/types'
import { long } from '../../lib/duration'
import { totals } from './logStats'

export function ShowStats({ logs }: { logs: PerformanceLog[] }) {
  const t = totals(logs)
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-5 sm:grid-cols-4">
        {[
          ['Shows', String(t.shows)],
          ['On stage', long(t.stageSeconds)],
          ['Avg rating', t.rating === null ? 'None yet' : `${t.rating.toFixed(1)} of 5`],
          ['Median crowd', t.audience === null ? 'None yet' : `${Math.round(t.audience)} people`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-dim">{label}</dt>
            <dd className="headline mt-1 truncate text-[28px] tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-faint">The average rating weights each show by its length, so a long set counts for more.</p>
    </>
  )
}
