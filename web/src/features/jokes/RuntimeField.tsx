/**
 * A joke's runtime: minutes and seconds boxes (DurationInput), or step it five seconds at a time
 * with − and + (or the arrow keys), never below 0:00. With no runtime set, the boxes are empty and
 * the buttons start from the default 0:15, the same as a new joke.
 */
import { Minus, Plus } from 'lucide-react'
import { DurationInput } from '../../components/ui/DurationInput'
import { DEFAULT_RUNTIME } from '../../lib/duration'

const STEP = 5

const button = 'inline-flex size-10 items-center justify-center rounded-lg bg-ink-3 text-paper/80 hover:bg-ink-4 hover:text-paper'

export function RuntimeField({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const step = (up: boolean) => onChange(Math.max(0, (value || DEFAULT_RUNTIME) + (up ? STEP : -STEP)))
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Shorter" onClick={() => step(false)} className={button}><Minus size={16} /></button>
      <DurationInput empty label="Duration" value={value} onChange={onChange}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp') } }} />
      <button type="button" aria-label="Longer" onClick={() => step(true)} className={button}><Plus size={16} /></button>
    </div>
  )
}
