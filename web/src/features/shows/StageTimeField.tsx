/**
 * Time on stage as two small boxes, minutes and seconds, so a 10 minute spot is just "10".
 * Each box keeps what you typed (digits only); the sheet adds them up when it saves.
 */
import { Input } from '../../components/ui/Field'
import type { StageTime } from './stageTime'

const digits = (text: string) => text.replace(/\D/g, '').slice(0, 3)

function Box({ unit, value, placeholder, onChange }: { unit: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Input inputMode="numeric" aria-label={`Time on stage, ${unit === 'min' ? 'minutes' : 'seconds'}`} placeholder={placeholder}
        value={value} onChange={(e) => onChange(digits(e.target.value))} className="pr-10 tabular" />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-faint">{unit}</span>
    </div>
  )
}

export function StageTimeField({ value, onChange }: { value: StageTime; onChange: (t: StageTime) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-sm text-dim">Time on stage</legend>
      <div className="flex gap-1.5">
        <Box unit="min" placeholder="6" value={value.min} onChange={(min) => onChange({ ...value, min })} />
        <Box unit="sec" placeholder="30" value={value.sec} onChange={(sec) => onChange({ ...value, sec })} />
      </div>
    </fieldset>
  )
}
