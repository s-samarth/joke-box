/**
 * A joke's runtime: type it ("1:30", "2m", "45") or step it five seconds at a time with − and +
 * (or the arrow keys), never below 0:00.
 * The text box keeps its own draft while you type and only reports a value on blur, so a
 * half-typed "1:" never saves. With no runtime set, the box is empty and the buttons start from
 * the default 0:15, the same as a new joke.
 */
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { clock, DEFAULT_RUNTIME, parse } from '../../lib/duration'

const STEP = 5

const button = 'inline-flex size-10 items-center justify-center rounded-lg bg-ink-3 text-paper/80 hover:bg-ink-4 hover:text-paper'

export function RuntimeField({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const [text, setText] = useState(value ? clock(value) : '')
  const set = (s: number) => { onChange(s); setText(s ? clock(s) : '') }
  const from = () => (text.trim() ? parse(text) ?? value : value || DEFAULT_RUNTIME)
  const step = (up: boolean) => set(Math.max(0, from() + (up ? STEP : -STEP)))
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Shorter" onClick={() => step(false)} className={button}><Minus size={16} /></button>
      <input aria-label="Duration" inputMode="numeric" placeholder="Not set" value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => { const s = parse(text); if (s !== null) set(s); else setText(value ? clock(value) : '') }}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp') } }}
        className="h-10 w-20 rounded-lg bg-ink-3 px-3 text-center text-[16px] tabular outline-none focus:ring-2 focus:ring-tape sm:text-[15px]" />
      <button type="button" aria-label="Longer" onClick={() => step(true)} className={button}><Plus size={16} /></button>
    </div>
  )
}
