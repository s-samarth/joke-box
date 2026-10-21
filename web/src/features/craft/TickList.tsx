/** A checklist to tick through, with a count. The ticks belong to the screen, not the note. */
import { Check } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { ListItem } from './bodyFormat'
import { inlineRuns } from './bodyFormat'

interface Props {
  items: ListItem[]
  ticked: number[]
  onTick: (line: number) => void
  onReset: () => void
}

export function TickList({ items, ticked, onTick, onReset }: Props) {
  const done = items.filter((i) => ticked.includes(i.line)).length
  return (
    <div>
      <p className="mb-3 flex items-baseline justify-between text-sm text-dim tabular">
        <span>{done} of {items.length} ticked</span>
        {done > 0 && <Button variant="quiet" small onClick={onReset}>Untick all</Button>}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const on = ticked.includes(item.line)
          return (
            <li key={item.line}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => onTick(item.line)}
                className="flex w-full gap-3 rounded-lg px-2 py-2 text-left text-[15px] leading-snug hover:bg-ink-3">
                <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ${on ? 'bg-ok text-ink ring-ok' : 'ring-rule-strong'}`}>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={on ? 'text-dim' : ''}>
                  {inlineRuns(item.text).map((r, i) => (r.bold ? <strong key={i} className="font-semibold">{r.text}</strong> : <span key={i}>{r.text}</span>))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
