/**
 * One block of a beat: a premise with its jokes, jokes with no premise, or crowd work. It drags by
 * the grip on its heading, or steps with the arrows. While any block is dragged, every block folds
 * to its heading (`folded`) so a long premise is easy to move.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Lightbulb, ListChecks, Plus, Trash2 } from 'lucide-react'
import type { Premise } from '../../api/premises'
import type { Beat, Joke, SetEntry } from '../../api/types'
import { Button } from '../../components/ui/Button'
import type { MenuItem } from '../../components/ui/Menu'
import { CrowdBlock } from './CrowdBlock'
import { mapEntry, mapPieces } from './beatEdit'
import { DragGrip } from './DragGrip'
import { PieceList } from './PieceList'
import { entryKey, type DragData } from './useBeatDrag'

export interface BlockProps {
  beat: Beat
  onChange: (beat: Beat) => void
  jokes: Map<string, Joke>
  premises: Map<string, Premise>
  leadOf: (clusterId: string) => string | null | undefined
  onOpen: (joke: Joke) => void
  onAddJokes: (entryId: string | null, gateId?: string | null) => void
}

interface Props extends BlockProps {
  entry: SetEntry
  index: number
  /** It's after the beat's first premise, so it can be gated on the one before. */
  canGatePremise: boolean
  folded: boolean
  onStep: (d: -1 | 1) => void
  onRemove: () => void
  selecting: string[] | null
  onSelect: (on: boolean) => void
  onPick: (pieceId: string) => void
  onGroup: (pieceIds: string[]) => void
  moveItems: (pieceId: string) => (MenuItem | 'divider')[]
}

const icon = 'inline-flex size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'
const foot = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-dim hover:bg-ink-3 hover:text-paper pointer-coarse:h-10'
const eyebrow = 'text-[11.5px] font-semibold tracking-[0.13em] uppercase'

function heading(entry: SetEntry, premise?: Premise) {
  if (entry.kind === 'crowd') return <span className={`${eyebrow} text-orchid`}>Crowd work</span>
  if (entry.kind === 'jokes') return <span className={`${eyebrow} text-faint`}>No premise</span>
  return <span className={`${eyebrow} text-faint`}>Premise{premise ? '' : ' (deleted)'}</span>
}

function summary(entry: SetEntry, premise?: Premise) {
  if (entry.kind === 'crowd') return `${entry.questions.length} ${entry.questions.length === 1 ? 'question' : 'questions'}`
  const jokes = `${entry.pieces.length} ${entry.pieces.length === 1 ? 'joke' : 'jokes'}`
  return entry.kind === 'premise' ? `${premise?.take ?? 'Deleted premise'} · ${jokes}` : jokes
}

export function EntryBlock({ entry, index, beat, onChange, premises, canGatePremise, folded, onStep, onRemove, selecting, onSelect, onPick, onGroup, onAddJokes, ...list }: Props) {
  const data: DragData = { kind: 'entry', entryId: entry.id }
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entryKey(entry.id), data })
  const style = { transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }
  const premise = entry.kind === 'premise' && entry.premise_id ? premises.get(entry.premise_id) : undefined
  const gated = entry.kind === 'premise' && entry.gate
  const name = entry.kind === 'premise' ? (premise?.take ?? 'the premise') : entry.kind === 'crowd' ? 'the crowd work' : 'the jokes with no premise'
  return (
    <li ref={setNodeRef} style={style} data-entry={entry.id} className={`rounded-xl p-2.5 ring-1 sm:p-3 ${gated ? 'bg-sky/5 ring-sky/40' : 'ring-rule'} ${isDragging ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-1">
        <DragGrip label={name} listeners={listeners} attributes={attributes} setRef={setActivatorNodeRef} />
        <span className="w-5 text-sm font-semibold text-faint tabular">{index + 1}</span>
        {heading(entry, premise)}
        <span className="ml-auto flex">
          <button type="button" className={icon} disabled={index === 0} onClick={() => onStep(-1)} aria-label={`Move up: ${name}`}><ArrowUp size={15} /></button>
          <button type="button" className={icon} disabled={index === beat.entries.length - 1} onClick={() => onStep(1)} aria-label={`Move down: ${name}`}><ArrowDown size={15} /></button>
          <button type="button" className={`${icon} ml-2`} onClick={onRemove} aria-label={`Remove from the beat: ${name}`}><Trash2 size={16} /></button>
        </span>
      </div>
      {folded ? <p className="mt-1 truncate pl-9 text-sm text-dim">{summary(entry, premise)}</p> : <>
        {entry.kind === 'premise' && (
          <div className="mt-1.5 mb-3">
            <p className="leading-snug font-medium">{premise?.take ?? 'This premise was deleted. Its jokes stay.'}</p>
            {premise?.notes && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{premise.notes}</p>}
            {canGatePremise && (
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
            <PieceList {...list} entryId={entry.id} pieces={entry.pieces} onChange={(pieces) => onChange(mapPieces(beat, entry.id, () => pieces))}
              onAddToGate={(gateId) => onAddJokes(entry.id, gateId)} picked={selecting ?? undefined} onPick={onPick} />
            {selecting ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button small variant="tape" icon={<Lightbulb size={15} />} disabled={!selecting.length} onClick={() => onGroup(selecting)}>
                  {selecting.length ? `Put ${selecting.length === 1 ? 'it' : `these ${selecting.length}`} under a premise` : 'Tick jokes for a premise'}
                </Button>
                <Button small variant="quiet" onClick={() => onSelect(false)}>Cancel</Button>
              </div>
            ) : <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" onClick={() => onAddJokes(entry.id)} className={foot}><Plus size={14} /> Joke</button>
              {entry.kind === 'jokes' && entry.pieces.length > 0 && <button type="button" onClick={() => onSelect(true)} className={foot}><ListChecks size={14} /> Select some for a premise</button>}
            </div>}
          </div>
        )}
      </>}
    </li>
  )
}
