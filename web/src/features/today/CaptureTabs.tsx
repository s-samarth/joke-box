/**
 * Home's writing box, in three: Observation (picked when Home opens), Premise and Joke. Each tab
 * shows its own box, and all three stay mounted, so a half-written draft survives a switch. Home
 * holds which tab is open, so the joke nudge's Write it can switch to Joke.
 * Pattern: WAI-ARIA tabs; arrow keys move between them.
 */
import type { KeyboardEvent } from 'react'
import { ObservationBox } from '../observations/ObservationBox'
import { PremiseBox } from '../premises/PremiseBox'
import { QuickCapture } from './QuickCapture'

const TABS = [
  { id: 'observation', label: 'Observation', dot: 'bg-orchid' },
  { id: 'premise', label: 'Premise', dot: 'bg-sky' },
  { id: 'joke', label: 'Joke', dot: 'bg-ok' },
] as const

export type CaptureTab = (typeof TABS)[number]['id']

export function CaptureTabs({ tab, onTab: setTab }: { tab: CaptureTab; onTab: (tab: CaptureTab) => void }) {
  const step = (e: KeyboardEvent, i: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!move) return
    const next = TABS[(i + move + TABS.length) % TABS.length].id
    setTab(next)
    document.getElementById(`capture-tab-${next}`)?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="What are you writing?" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-ink-3 p-1">
        {TABS.map(({ id, label, dot }, i) => {
          const on = tab === id
          return (
            <button key={id} id={`capture-tab-${id}`} type="button" role="tab" aria-selected={on} aria-controls={`capture-panel-${id}`} tabIndex={on ? 0 : -1}
              onClick={() => setTab(id)} onKeyDown={(e) => step(e, i)}
              className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg text-[15px] transition ${on ? 'bg-paper font-semibold text-ink' : 'text-dim hover:text-paper'}`}>
              <span className={`hidden size-2 shrink-0 rounded-full min-[360px]:block ${dot}`} />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
      {TABS.map(({ id }) => (
        <div key={id} id={`capture-panel-${id}`} role="tabpanel" aria-labelledby={`capture-tab-${id}`} hidden={tab !== id}>
          {id === 'observation' ? <ObservationBox /> : id === 'premise' ? <PremiseBox /> : <QuickCapture />}
        </div>
      ))}
    </div>
  )
}
