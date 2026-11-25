/**
 * A beat's list, in order: premises with their jokes, jokes with no premise (they can sit
 * between premises), and crowd work. A premise after the first can be gated on the one before.
 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Premise } from '../../api/premises'
import type { Beat, Joke, SetEntry } from '../../api/types'
import { CrowdBlock } from './CrowdBlock'
import { mapEntry, mapPieces, setEntries, swap } from './beatEdit'
import { PieceList } from './PieceList'

interface Props {
  beat: Beat
  onChange: (beat: Beat) => void
  jokes: Map<string, Joke>
  premises: Map<string, Premise>
  leadOf: (clusterId: string) => string | null | undefined
  onOpen: (joke: Joke) => void
  onAddJokes: (entryId: string | null) => void
}

const icon = 'inline-flex size-8 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'
const eyebrow = 'text-[11.5px] font-semibold tracking-[0.13em] uppercase'

function Heading({ entry, premise }: { entry: SetEntry; premise?: Premise }) {
  if (entry.kind === 'crowd') return <span className={`${eyebrow} text-orchid`}>Crowd work</span>
  if (entry.kind === 'jokes') return <span className={`${eyebrow} text-faint`}>No premise</span>
  return <span className={`${eyebrow} text-faint`}>Premise{premise ? '' : ' (deleted)'}</span>
}

export function EntryList({ beat, onChange, jokes, premises, leadOf, onOpen, onAddJokes }: Props) {
  const entries = beat.entries
  if (!entries.length) return <p className="rounded-lg border border-dashed border-rule-strong p-5 text-center text-dim">Empty beat. Add a premise, jokes or crowd work below.</p>
  const firstPremise = entries.findIndex((e) => e.kind === 'premise')
  return (
    <ol className="space-y-3">
      {entries.map((entry, i) => {
        const premise = entry.kind === 'premise' && entry.premise_id ? premises.get(entry.premise_id) : undefined
        const gated = entry.kind === 'premise' && entry.gate
        return (
          <li key={entry.id} className={`rounded-xl p-3 ring-1 ${gated ? 'bg-sky/5 ring-sky/40' : 'ring-rule'}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-faint tabular">{i + 1}</span>
              <Heading entry={entry} premise={premise} />
              <span className="ml-auto flex">
                <button type="button" className={icon} disabled={i === 0} onClick={() => onChange(setEntries(beat, swap(entries, i, -1)))} aria-label="Move up"><ArrowUp size={15} /></button>
                <button type="button" className={icon} disabled={i === entries.length - 1} onClick={() => onChange(setEntries(beat, swap(entries, i, 1)))} aria-label="Move down"><ArrowDown size={15} /></button>
                <button type="button" className={icon} onClick={() => onChange(setEntries(beat, entries.filter((e) => e.id !== entry.id)))} aria-label="Remove from the beat"><Trash2 size={15} /></button>
              </span>
            </div>
            {entry.kind === 'premise' && (
              <div className="mt-1.5 mb-3">
                <p className="leading-snug font-medium">{premise?.take ?? 'This premise was deleted. Its jokes stay.'}</p>
                {premise?.notes && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{premise.notes}</p>}
                {i > firstPremise && (
                  <label className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-[13px] ${gated ? 'bg-sky/15 text-sky' : 'bg-ink-3 text-dim'}`}>
                    <input type="checkbox" className="accent-sky" checked={gated} onChange={(e) => onChange(mapEntry(beat, entry.id, (x) => ({ ...x, gate: e.target.checked })))} />
                    Gate: only if the premise before it landed
                  </label>
                )}
              </div>
            )}
            {entry.kind === 'crowd' ? (
              <div className="mt-2"><CrowdBlock entry={entry} onChange={(next) => onChange(mapEntry(beat, entry.id, () => next))} /></div>
            ) : (
              <div className={entry.kind === 'jokes' ? 'mt-2' : ''}>
                <PieceList pieces={entry.pieces} jokes={jokes} leadOf={leadOf} onOpen={onOpen} onChange={(pieces) => onChange(mapPieces(beat, entry.id, () => pieces))} />
                <button type="button" onClick={() => onAddJokes(entry.id)} className="mt-2 inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-dim hover:bg-ink-3 hover:text-paper">
                  <Plus size={14} /> Joke
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
