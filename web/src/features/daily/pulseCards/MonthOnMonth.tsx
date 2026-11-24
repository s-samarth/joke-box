/**
 * Month on month: pieces written and each step's share, for the last six months, each month
 * counted on what was written that month. Months still settling are faded, and the arrow compares
 * the last two that have settled, so a young month can't look like a slump.
 */
import { ArrowDown, ArrowUp } from 'lucide-react'
import { KIND_META } from '../activity'
import { STEP_LABELS } from '../pulse'
import type { MonthRow } from '../pulseTrends'
import { share } from './format'
import { PulseCard } from './PulseCard'

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const short = (month: string) => SHORT[Number(month.slice(5)) - 1]

interface Series {
  label: string
  bar: string
  text: string
  unit: string
  values: (number | null)[]
  /** Shares settle as ideas go on; a count is final once its month is over. */
  settles: boolean
}

function Bars({ series, months }: { series: Series; months: MonthRow[] }) {
  const { values, unit } = series
  const young = (m: MonthRow, i: number) => (series.settles ? m.settling : i === months.length - 1)
  const max = Math.max(1, ...values.map((v) => v ?? 0))
  const settled = months.map((m, i) => ({ v: values[i], m, i })).filter((x) => !young(x.m, x.i) && x.v !== null)
  const [before, last] = settled.slice(-2)
  const delta = before && last ? (last.v ?? 0) - (before.v ?? 0) : null
  return (
    <div className="border-t border-rule py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 text-[15px]">{series.label}</span>
        {delta !== null && last && before && (
          <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs tabular ${delta >= 0 ? 'text-ok' : 'text-light'}`}>
            {delta >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(delta)}{unit ? ' pts' : ''} {short(last.m.month)} vs {short(before.m.month)}
          </span>
        )}
      </div>
      <div className="mt-2 flex h-14 items-end gap-1" aria-hidden>
        {months.map((m, i) => {
          const v = values[i]
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className={`mb-0.5 text-[11px] tabular ${young(m, i) ? 'text-faint' : 'text-dim'}`}>{v === null ? '–' : `${v}${unit}`}</span>
              <span className={`w-full rounded-[3px] ${series.bar} ${young(m, i) ? 'opacity-30' : 'opacity-80'}`} style={{ height: `${v ? Math.max(4, (v / max) * 70) : 0}%` }} />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1" aria-hidden>
        {months.map((m) => <span key={m.month} className="flex-1 text-center text-[11px] text-faint">{short(m.month)}</span>)}
      </div>
    </div>
  )
}

export function MonthOnMonth({ months }: { months: MonthRow[] }) {
  const series: Series[] = [
    { label: 'Pieces written', bar: 'bg-paper', text: 'text-paper', unit: '', values: months.map((m) => m.written), settles: false },
    ...STEP_LABELS.map((label, i) => {
      const kind = months[0].steps[i].kind
      return { label, bar: KIND_META[kind].dot, text: KIND_META[kind].text, unit: '%', values: months.map((m) => (m.steps[i].of ? share(m.steps[i]) : null)), settles: true }
    }),
  ]
  return (
    <PulseCard title="Month on month, of what you wrote each month" className="@container">
      <div className="grid gap-x-5 @lg:grid-cols-2">{series.map((s) => <Bars key={s.label} series={s} months={months} />)}</div>
      <p className="mt-1 text-xs text-faint">Faded months are still settling: ideas take a few weeks to go somewhere, and this month isn't over.</p>
    </PulseCard>
  )
}
