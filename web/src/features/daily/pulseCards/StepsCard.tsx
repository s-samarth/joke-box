/** How far ideas got, of the last 90 days: one bar per step, the narrowest in red. */
import { KIND_META } from '../activity'
import { WINDOW, type Step } from '../pulse'
import { share } from './format'
import { PulseCard } from './PulseCard'

export function StepsCard({ steps, narrowest }: { steps: Step[]; narrowest: Step | null }) {
  return (
    <PulseCard title={`How far ideas got, of what you wrote in the last ${WINDOW} days`}>
      <ul className="space-y-3.5">
        {steps.map((s) => {
          const low = narrowest?.label === s.label
          return (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0">{s.label}{low && <span className="ml-2 text-xs text-light">narrowest</span>}</span>
                <span className="shrink-0 text-sm text-dim tabular"><b className="font-semibold text-paper">{s.done}</b> of {s.of}{s.of ? ` · ${share(s)}%` : ''}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-3" aria-hidden>
                <span className={`block h-full rounded-full ${low ? 'bg-light' : KIND_META[s.kind].dot}`} style={{ width: `${share(s)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </PulseCard>
  )
}
