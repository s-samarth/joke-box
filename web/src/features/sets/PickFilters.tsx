/**
 * Status and clean-rating filters for picking jokes into a set. Each choice is a chip you tap
 * through three states: off, only (keep jokes with it) and not (hide jokes with it). Pick
 * several "only" chips to keep jokes with any of them, e.g. Stage Ready or Interesting.
 *
 * The chips sit in a panel that folds away under one button, so the narrow column stays short;
 * the button says how many chips are on.
 */
import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { useStatuses } from '../../api/library'
import { CLEAN_LABELS } from '../../lib/jokeMeta'
import { cycle, NO_PICKS, NONE, type PickState, type Picks } from './pickMatch'

function Chips({ label, options, picks, onChange }: { label: string; options: [string, string][]; picks: Picks; onChange: (p: Picks) => void }) {
  const tap = (v: string) => onChange(cycle(picks, v))
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs text-faint">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, name]) => {
          const state = picks[v]
          return (
            <button key={v} type="button" onClick={() => tap(v)} aria-label={`${name}: ${state === 'only' ? 'only these' : state === 'not' ? 'hidden' : 'any'}`}
              className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] transition ${state === 'only' ? 'bg-paper font-medium text-ink' : state === 'not' ? 'bg-ink-3 text-faint line-through' : 'bg-ink-3 text-dim hover:text-paper'}`}>
              {state === 'not' && <X size={12} className="no-underline" aria-hidden />}
              {name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function PickFilters({ value, onChange }: { value: PickState; onChange: (p: PickState) => void }) {
  const { data: statuses = [] } = useStatuses()
  const [open, setOpen] = useState(false)
  const on = Object.keys(value.status).length + Object.keys(value.clean).length
  return (
    <div className="col-span-2 space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className={`inline-flex h-10 flex-1 items-center justify-between rounded-lg px-3 text-[15px] ring-1 ring-rule transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-2 text-paper'}`}>
          {on ? `Status and clean rating (${on})` : 'Status and clean rating'}
          <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {on > 0 && <button type="button" onClick={() => onChange(NO_PICKS)} className="h-10 px-2 text-sm text-dim hover:text-paper">Clear</button>}
      </div>
      {open && (
        <div className="space-y-3 rounded-lg bg-ink-2 p-3 ring-1 ring-rule">
          <p className="text-xs text-dim">Tap once to show only these, again to hide them, again to reset.</p>
          <Chips label="Status" options={[...statuses.map((s): [string, string] => [s.name, s.name]), [NONE, 'No status']]}
            picks={value.status} onChange={(status) => onChange({ ...value, status })} />
          <Chips label="Clean rating" options={[...Object.entries(CLEAN_LABELS), [NONE, 'Not rated']]}
            picks={value.clean} onChange={(clean) => onChange({ ...value, clean })} />
        </div>
      )}
    </div>
  )
}
