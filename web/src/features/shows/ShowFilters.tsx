/** The less-used filters: a date range, stars, set length and crowd size. Period and venue are in the toolbar. */
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { AUDIENCE_BANDS, DURATION_BANDS, type LogFilters } from './logMath'

const chip = (on: boolean) => `h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

interface Props {
  open: boolean
  onClose: () => void
  value: LogFilters
  onChange: (f: LogFilters) => void
}

export function ShowFilters({ open, onClose, value, onChange }: Props) {
  const set = (c: Partial<LogFilters>) => onChange({ ...value, ...c })
  const clear = () => set({ from: '', to: '', rating: null, duration: null, audience: null })

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="More filters"
      footer={<><Button variant="quiet" onClick={clear}>Clear these</Button><Button variant="tape" onClick={onClose}>Done</Button></>}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} /></Field>
          <Field label="To"><Input type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} /></Field>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-dim">Rating</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(value.rating === null)} onClick={() => set({ rating: null })}>Any</button>
            {[5, 4, 3, 2, 1].map((r) => <button key={r} type="button" className={chip(value.rating === r)} onClick={() => set({ rating: r })}>{r} star{r > 1 ? 's' : ''}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time on stage">
            <Select value={value.duration ?? ''} onChange={(e) => set({ duration: e.target.value || null })}>
              <option value="">Any length</option>
              {DURATION_BANDS.map((b) => <option key={b.label}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Crowd">
            <Select value={value.audience ?? ''} onChange={(e) => set({ audience: e.target.value || null })}>
              <option value="">Any size</option>
              {AUDIENCE_BANDS.map((b) => <option key={b.label}>{b.label}</option>)}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
