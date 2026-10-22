/**
 * A joke's runtime: type it ("1:30", "2m", "45") or step it with − and +. The text box keeps its
 * own draft while you type and only reports a value on blur, so a half-typed "1:" never saves.
 */
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { clock, nudge, parse } from '../../lib/duration'

const button = 'inline-flex size-10 items-center justify-center rounded-lg bg-ink-3 text-dim hover:text-paper disabled:opacity-40'

export function RuntimeField({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const [text, setText] = useState(value ? clock(value) : '')
  const set = (s: number) => { onChange(s); setText(s ? clock(s) : '') }
  const step = (up: boolean) => set(nudge(parse(text) ?? value, up))
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Shorter" onClick={() => step(false)} disabled={!value} className={button}><Minus size={16} /></button>
      <input aria-label="Duration" inputMode="numeric" placeholder="0:15" value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => { const s = parse(text); if (s !== null) set(s); else setText(value ? clock(value) : '') }}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp') } }}
        className="h-10 w-20 rounded-lg bg-ink-3 px-3 text-center text-[16px] tabular outline-none focus:ring-2 focus:ring-tape sm:text-[15px]" />
      <button type="button" aria-label="Longer" onClick={() => step(true)} className={button}><Plus size={16} /></button>
    </div>
  )
}
