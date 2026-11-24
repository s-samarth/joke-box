/**
 * Best months, as a shelf of six records (like Strava's best efforts). Each tile is also the
 * switch for the chart under it: tap one to see that measure month by month.
 */
import { bestMonth, type Measure, type MonthTotals } from './highlightMath'
import { MEASURES, shortMonth } from './measures'

export function RecordShelf({ rows, picked, onPick }: { rows: MonthTotals[]; picked: Measure; onPick: (m: Measure) => void }) {
  return (
    <div role="radiogroup" aria-label="Best months" className="grid grid-cols-3 gap-2 @lg:grid-cols-6">
      {MEASURES.map((m) => {
        const best = bestMonth(rows, m.key)
        const on = picked === m.key
        return (
          <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => onPick(m.key)}
            className={`min-w-0 rounded-xl border p-2.5 text-left transition ${on ? 'border-paper/50 bg-ink-3' : 'border-rule bg-ink-2 hover:bg-ink-3'}`}>
            <span className="flex items-center gap-1.5 truncate text-[11px] text-dim sm:text-xs">
              <span className={`size-2 shrink-0 rounded-full ${m.dot}`} aria-hidden />{m.label}
            </span>
            <span className={`headline mt-1.5 block truncate text-[24px] tabular ${best ? m.text : 'text-faint'}`}>{!best ? '–' : m.key === 'stage' ? m.say(best.stage) : best[m.key]}</span>
            <span className="mt-0.5 block truncate text-[11px] text-dim sm:text-xs">{best ? shortMonth(best.month) : 'Nothing yet'}</span>
          </button>
        )
      })}
    </div>
  )
}
