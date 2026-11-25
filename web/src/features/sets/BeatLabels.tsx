/**
 * A beat's labels, in this set (not on the jokes: the same joke can play a different status in
 * another set). Not sure is always there. When the status changes from the beat before, it asks
 * why: Top-up, Planned turn or Clash ("Shift, don't flip").
 */
import type { Beat, SetField, SetFieldOption } from '../../api/types'
import { filled, optionColor } from '../../lib/labelColors'
import { NOT_SURE, SHIFT_REASONS, labelOf, statusField } from './beats'

const seg = (on: boolean, unsure = false) =>
  `min-h-8 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors ${on ? (unsure ? 'bg-faint text-ink' : 'bg-paper text-ink') : 'bg-ink-3 text-dim hover:text-paper'}`

/** Every option wears its colour (lib/labelColors): a dot until it's picked, then filled. Not sure is amber. */
function Option({ option, on, label, onPick }: { option: SetFieldOption | null; on: boolean; label: string; onPick: () => void }) {
  const hex = optionColor(option)
  return (
    <button type="button" aria-pressed={on} onClick={onPick} style={on ? filled(hex) : undefined}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors ${on ? '' : 'bg-ink-3 text-dim hover:text-paper'}`}>
      {!on && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />}{label}
    </button>
  )
}

interface Props {
  beat: Beat
  previous: Beat | null
  fields: SetField[]
  needsWhy: boolean
  onChange: (beat: Beat) => void
}

export function BeatLabels({ beat, previous, fields, needsWhy, onChange }: Props) {
  const set = (fieldId: string, optionId: string | null) => {
    const labels = { ...beat.labels }
    if (optionId) labels[fieldId] = optionId
    else delete labels[fieldId]
    onChange({ ...beat, labels })
  }
  const status = statusField(fields)
  const was = previous && status ? labelOf(previous, status)?.label : null
  const now = status ? labelOf(beat, status)?.label : null
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const current = labelOf(beat, f)
        return (
          <div key={f.id}>
            <p className="mb-1.5 text-sm text-dim">{f.name}</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label={f.name}>
              {f.options.map((o) => <Option key={o.id} option={o} label={o.label} on={current?.id === o.id} onPick={() => set(f.id, o.id)} />)}
              <Option option={null} label={NOT_SURE} on={!current} onPick={() => set(f.id, null)} />
            </div>
          </div>
        )
      })}
      {needsWhy && (
        <div className={`rounded-lg p-3 ring-1 ${SHIFT_REASONS.some((r) => r === beat.shift_reason) ? 'bg-ink-2 ring-rule' : 'bg-amber/10 ring-amber/40'}`}>
          <p className="mb-1.5 text-sm text-paper">{previous?.cue || 'The beat before'} is {was}, this beat is {now}. Why the shift?</p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Why the shift">
            {SHIFT_REASONS.map((r) => (
              <button key={r} type="button" aria-pressed={beat.shift_reason === r} className={seg(beat.shift_reason === r)} onClick={() => onChange({ ...beat, shift_reason: r })}>{r}</button>
            ))}
            <button type="button" aria-pressed={!beat.shift_reason} className={seg(!beat.shift_reason, true)} onClick={() => onChange({ ...beat, shift_reason: '' })}>{NOT_SURE}</button>
          </div>
        </div>
      )}
    </div>
  )
}
