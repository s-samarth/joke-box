/**
 * The month's writing in the calendar card: how many pieces, how many a day, and one bar split by
 * kind. Its labels double as the calendar's colour key, the gold one for nights on stage.
 */
import { KIND_META, KINDS, type MonthSummary } from './activity'

export function MonthMix({ month, today, summary, micNights }: { month: string; today: string; summary: MonthSummary; micNights: number }) {
  const { total, sofar } = summary
  const current = month === today.slice(0, 7)
  const perDay = sofar ? (total / sofar).toFixed(1) : '0'

  return (
    <div aria-label="This month's writing" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <p className="font-semibold">{total} {total === 1 ? 'piece' : 'pieces'} written{current ? ' so far' : ''}</p>
        {total > 0 && <p className="shrink-0 text-sm text-dim">{perDay} a day</p>}
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-ink-3">
        {KINDS.filter((k) => summary[k]).map((k) => (
          <span key={k} className={KIND_META[k].dot} style={{ flexGrow: summary[k] }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dim">
        {KINDS.map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${KIND_META[k].dot}`} />
            <b className="font-semibold text-paper tabular">{summary[k]}</b> {summary[k] === 1 ? KIND_META[k].one : KIND_META[k].many}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-tape" />
          <b className="font-semibold text-paper tabular">{micNights}</b> {micNights === 1 ? 'mic night' : 'mic nights'}
        </li>
      </ul>
    </div>
  )
}
