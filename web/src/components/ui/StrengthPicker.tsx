/**
 * Strength, on a joke, a premise or an observation: Unrated, or one of five bars, from Weak to
 * Killer. Everything starts Unrated; tapping the bar that's already picked clears it again, so a
 * rating is never forced on something you haven't tried yet.
 */
import { STRENGTH_LABELS, UNRATED } from '../../lib/jokeMeta'
import { choice } from './choice'

export function StrengthPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Strength">
      <button type="button" role="radio" aria-checked={value == null} onClick={() => onChange(null)} className={choice(value == null)}>{UNRATED}</button>
      <div className="-ml-1 flex items-end">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={STRENGTH_LABELS[n - 1]} onClick={() => onChange(value === n ? null : n)}
            className="flex size-11 items-end justify-center rounded-md pb-2 hover:bg-ink-3">
            <span className={`w-2 rounded-[2px] ${value != null && n <= value ? 'bg-tape' : 'bg-ink-4'}`} style={{ height: `${8 + n * 3}px` }} />
          </button>
        ))}
      </div>
      {value != null && <span className="text-sm text-dim">{STRENGTH_LABELS[value - 1]}</span>}
    </div>
  )
}

