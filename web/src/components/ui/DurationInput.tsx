/**
 * A duration as two small boxes, minutes and seconds, so it's typed on a phone's number pad with
 * no colon. Each box keeps its own draft and the total is reported when you leave it, so a
 * half-typed time never saves. Seconds above 59 are clamped to 59. Stored as whole seconds.
 * With `empty` set, 0 shows as blank boxes (for "Not set").
 */
import { useState } from 'react'
import { fromParts as total } from '../../lib/duration'

const digits = (text: string) => text.replace(/\D/g, '').slice(0, 3)


function split(seconds: number, empty: boolean): [string, string] {
  if (empty && !seconds) return ['', '']
  const s = Math.max(0, Math.round(seconds))
  return [String(Math.floor(s / 60)), String(s % 60).padStart(2, '0')]
}

interface Props {
  value: number
  onChange: (seconds: number) => void
  label: string
  empty?: boolean
  small?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function DurationInput({ value, onChange, label, empty = false, small = false, onKeyDown }: Props) {
  const [shown, setShown] = useState(value)
  const [[min, sec], setParts] = useState(() => split(value, empty))
  if (shown !== value) { setShown(value); setParts(split(value, empty)) }
  const commit = () => {
    const s = total(min, sec)
    setParts(split(s, empty))
    if (s !== value) onChange(s)
  }
  const box = `${small ? 'h-7 w-9 text-[14px]' : 'h-10 w-12 text-[16px] sm:text-[15px]'} rounded-lg bg-ink-3 text-center text-paper tabular ring-1 ring-rule-strong outline-none focus:ring-2 focus:ring-tape`
  const unit = 'text-xs text-faint'
  return (
    <span role="group" aria-label={label} className="inline-flex items-center gap-1"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit() }}>
      <input aria-label={`${label}, minutes`} inputMode="numeric" placeholder={empty ? '–' : '0'} value={min} onKeyDown={onKeyDown}
        onChange={(e) => setParts([digits(e.target.value), sec])} onFocus={(e) => e.target.select()} className={box} />
      <span className={unit}>m</span>
      <input aria-label={`${label}, seconds`} inputMode="numeric" placeholder={empty ? '–' : '00'} value={sec} onKeyDown={onKeyDown}
        onChange={(e) => setParts([min, digits(e.target.value).slice(0, 2)])} onFocus={(e) => e.target.select()} className={box} />
      <span className={unit}>s</span>
    </span>
  )
}
