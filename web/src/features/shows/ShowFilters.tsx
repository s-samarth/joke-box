/** Narrow the list: venues, dates, stars, set length and crowd size. Stats follow the filters. */
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { AUDIENCE_BANDS, DURATION_BANDS, NO_FILTERS, type LogFilters } from './logMath'

const chip = (on: boolean) => `h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

interface Props {
  open: boolean
  onClose: () => void
  venues: string[]
  value: LogFilters
  onChange: (f: LogFilters) => void
}

export function ShowFilters({ open, onClose, venues, value, onChange }: Props) {
  const set = (c: Partial<LogFilters>) => onChange({ ...value, ...c })
  const toggle = (v: string) => set({ venues: value.venues.includes(v) ? value.venues.filter((x) => x !== v) : [...value.venues, v] })

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Filter shows"
      footer={<><Button variant="quiet" onClick={() => onChange(NO_FILTERS)}>Clear all</Button><Button variant="tape" onClick={onClose}>Done</Button></>}>
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-sm text-dim">Venues</span>
          <div className="flex flex-wrap gap-2">{venues.map((v) => <button key={v} type="button" aria-pressed={value.venues.includes(v)} className={chip(value.venues.includes(v))} onClick={() => toggle(v)}>{v}</button>)}</div>
        </div>
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
