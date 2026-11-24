/**
 * A premise's or an observation's status, as four chips: Draft (where every one starts), Work in
 * Progress, Stage Ready and Discarded. It's its own: discarding a premise leaves its jokes, and
 * their statuses, as they are.
 */
import { PREMISE_STATUSES, type PremiseStatus } from '../../api/premises'
import { choice } from '../../components/ui/choice'

export function PremiseStatusPicker({ value, onChange }: { value: PremiseStatus; onChange: (v: PremiseStatus) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Status">
      {PREMISE_STATUSES.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)} className={choice(value === s)}>{s}</button>
      ))}
    </div>
  )
}

/** The small label on a list row. A Draft has none, since that's where every premise starts. */
export function PremiseStatusTag({ status }: { status: PremiseStatus }) {
  if (status === 'Draft') return null
  const tone = status === 'Stage Ready' ? 'bg-tape/15 text-tape' : status === 'Discarded' ? 'bg-ink-3 text-faint' : 'bg-ink-3 text-dim'
  return <span className={`rounded px-1.5 py-px text-[11px] leading-4 ${tone}`}>{status}</span>
}
