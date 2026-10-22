/**
 * A grid of colour swatches plus a "Custom" swatch for any colour at all.
 *
 * Pattern: the swatches are a radio group (one choice, arrow keys move between them via the
 * browser's native radio behaviour), and Custom wraps a native <input type="color">, which opens
 * the system colour picker for free. While you drag inside that picker the browser fires `input`
 * (React's onChange) many times; we only preview those, and save on the native `change` event,
 * which fires once when you settle on a colour.
 */
import { Check, Pipette } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { SWATCHES, onColor } from '../../lib/typeColors'

interface Props {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorSwatches({ value, onChange, label = 'Colour' }: Props) {
  const group = useId()
  const picker = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const current = (preview ?? value).toLowerCase()
  // React has no prop for the native change event, so listen for it directly.
  useEffect(() => {
    const input = picker.current
    const done = () => {
      if (input) onChange(input.value)
      setPreview(null)
    }
    input?.addEventListener('change', done)
    return () => input?.removeEventListener('change', done)
  }, [onChange])
  const custom = !SWATCHES.some((s) => s.color === current)
  const ring = (on: boolean) => (on ? 'ring-2 ring-paper ring-offset-2 ring-offset-ink-2' : 'hover:scale-110')
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{label}</legend>
      {SWATCHES.map((s) => (
        <label key={s.color} title={s.name} className={`relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition ${ring(s.color === current)}`} style={{ backgroundColor: s.color }}>
          <input type="radio" name={group} value={s.color} checked={s.color === current} onChange={() => onChange(s.color)} aria-label={s.name} className="peer sr-only" />
          {s.color === current && <Check size={15} style={{ color: onColor(s.color) }} aria-hidden />}
          <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-tape" aria-hidden />
        </label>
      ))}
      <label title="Custom colour" className={`relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition ${custom ? ring(true) : 'bg-ink-3 text-dim hover:text-paper'}`} style={custom ? { backgroundColor: current } : undefined}>
        <input ref={picker} type="color" value={current} onChange={(e) => setPreview(e.target.value)} aria-label="Custom colour" className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
        {custom ? <Check size={15} style={{ color: onColor(current) }} aria-hidden /> : <Pipette size={15} aria-hidden />}
        <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-tape" aria-hidden />
      </label>
    </fieldset>
  )
}
