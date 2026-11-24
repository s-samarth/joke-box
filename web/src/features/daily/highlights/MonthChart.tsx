/**
 * One measure month by month, the last 12 months (like Apple Health's monthly view): the record
 * month lit in its colour when it falls in the window, this month outlined, and how this month
 * is pacing.
 */
import { daysBetween } from '../dailyMath'
import { bestMonth, type MonthTotals } from './highlightMath'
import { letter, longMonth, shortMonth, type MeasureMeta } from './measures'

const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate()

export function MonthChart({ rows, window, measure, today }: { rows: MonthTotals[]; window: MonthTotals[]; measure: MeasureMeta; today: string }) {
  const best = bestMonth(rows, measure.key)
  const values = window.map((r) => r[measure.key])
  const max = Math.max(1, ...values)
  const current = window[window.length - 1]
  const sofar = daysBetween(`${current.month}-01`, today) + 1
  const pace = Math.round((current[measure.key] / sofar) * daysIn(current.month))
  const label = `${measure.label}, month by month: ${window.map((r) => `${shortMonth(r.month)} ${measure.say(r[measure.key])}`).join(', ')}`

  return (
    <div className="rounded-xl border border-rule bg-ink-2 p-4">
      <p className="text-[15px]">
        {measure.label}, month by month
        {best && <span className="text-dim"> · best ever <b className={`font-semibold ${measure.text}`}>{longMonth(best.month)} {best.month.slice(0, 4)}</b>, {measure.say(best[measure.key])}</span>}
      </p>
      <div role="img" aria-label={label} className="mt-4 flex h-32 items-end gap-1 sm:gap-1.5">
        {window.map((r, i) => {
          const v = values[i]
          const top = best?.month === r.month
          const now = i === window.length - 1
          return (
            <div key={r.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className={`mb-1 text-[10px] tabular sm:text-[11px] ${top ? measure.text : 'text-faint'}`}>{v ? measure.short(v) : ''}</span>
              <span className={`w-full rounded-[3px] ${top ? measure.dot : 'bg-ink-4'} ${now && !top ? 'bg-transparent ring-1 ring-inset ring-paper/40' : ''}`} style={{ height: `${v ? Math.max(3, (v / max) * 80) : 0}%` }} />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-1.5" aria-hidden>
        {window.map((r) => <span key={r.month} className={`flex-1 text-center text-[11px] ${best?.month === r.month ? measure.text : 'text-faint'}`}>{letter(r.month)}</span>)}
      </div>
      <p className="mt-2.5 text-sm text-dim">
        {longMonth(current.month)} so far: {measure.say(current[measure.key])}{current[measure.key] ? `, on pace for ${measure.say(pace)}` : ''}.
      </p>
    </div>
  )
}
