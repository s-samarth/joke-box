/** Venue, date range, rating, duration band and audience band; plus clear all. */
import { Field, Input, Select } from '../../components/ui/Field'
import { AUDIENCE_BANDS, DURATION_BANDS, NO_FILTERS, type LogFilters } from './logMath'

export function FilterPanel({ venues, value, onChange }: { venues: string[]; value: LogFilters; onChange: (f: LogFilters) => void }) {
  const set = (changes: Partial<LogFilters>) => onChange({ ...value, ...changes })
  const toggleVenue = (v: string) =>
    set({ venues: value.venues.includes(v) ? value.venues.filter((x) => x !== v) : [...value.venues, v] })

  return (
    <div className="space-y-4 rounded-2xl bg-panel p-4 ring-1 ring-line">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted">Venues</span>
        <div className="flex flex-wrap gap-1.5">
          {venues.map((v) => (
            <button key={v} type="button" aria-pressed={value.venues.includes(v)} onClick={() => toggleVenue(v)} className={`h-8 rounded-full px-3 text-xs ring-1 ${value.venues.includes(v) ? 'bg-accent-soft text-accent ring-accent/30' : 'text-muted ring-line hover:text-text'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Field label="From"><Input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} /></Field>
        <Field label="To"><Input type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} /></Field>
        <Field label="Rating">
          <Select value={value.rating ?? ''} onChange={(e) => set({ rating: e.target.value ? Number(e.target.value) : null })}>
            <option value="">All</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r)}</option>)}
          </Select>
        </Field>
        <Field label="Duration">
          <Select value={value.duration ?? ''} onChange={(e) => set({ duration: e.target.value || null })}>
            <option value="">All</option>
            {DURATION_BANDS.map((b) => <option key={b.label}>{b.label}</option>)}
          </Select>
        </Field>
        <Field label="Audience">
          <Select value={value.audience ?? ''} onChange={(e) => set({ audience: e.target.value || null })}>
            <option value="">All</option>
            {AUDIENCE_BANDS.map((b) => <option key={b.label}>{b.label}</option>)}
          </Select>
        </Field>
      </div>
      <button type="button" onClick={() => onChange(NO_FILTERS)} className="text-sm text-accent hover:underline">Clear all filters</button>
    </div>
  )
}
