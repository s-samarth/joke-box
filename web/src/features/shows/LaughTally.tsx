/**
 * Count the laughs for LPM, folded away until you want it. Five counters, one per laugh score,
 * with the LPM worked out as you count (it needs the time on stage).
 */
import { Minus, Plus } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { LAUGH_SCORES, formatLpm, lpm } from './lpm'

export function LaughTally({ laughs, seconds, onChange }: { laughs: number[]; seconds: number | null; onChange: (laughs: number[]) => void }) {
  const set = (i: number, n: number) => onChange(laughs.map((c, j) => (j === i ? Math.max(0, n) : c)))
  const score = lpm(laughs, seconds ?? 0)
  const total = laughs.reduce((a, b) => a + b, 0)
  return (
    <details className="rounded-xl bg-ink-2 ring-1 ring-rule" open={total > 0}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none">
        <span className="text-sm text-dim">Count laughs for LPM</span>
        <span className="text-sm tabular">{score === null ? (total ? 'Add the time on stage' : 'Optional') : formatLpm(score)}</span>
      </summary>
      <ul className="space-y-1 px-2 pb-3">
        {LAUGH_SCORES.map(({ points, label }) => {
          const i = points - 1
          return (
            <li key={points} className="flex items-center gap-2 px-2">
              <span className="w-5 text-sm text-faint tabular">{points}</span>
              <span className="min-w-0 flex-1 text-[15px]">{label}</span>
              <IconButton label={`One less: ${label}`} onClick={() => set(i, laughs[i] - 1)} disabled={!laughs[i]}><Minus size={16} /></IconButton>
              <span className="w-7 text-center text-lg tabular" aria-live="polite">{laughs[i]}</span>
              <IconButton label={`One more: ${label}`} onClick={() => set(i, laughs[i] + 1)}><Plus size={16} /></IconButton>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
