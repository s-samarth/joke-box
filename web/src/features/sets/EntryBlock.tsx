/**
 * One block of a beat: a premise with its jokes, jokes with no premise, or crowd work. It drags by
 * the grip on its heading, or steps with the arrows. While any block is dragged, every block folds
 * to its heading (`folded`) so a long premise is easy to move. A premise is outlined and written in
 * leaf green (sky blue when gated), crowd work in orchid pink, standalone jokes in white, each with a thick left border. A premise shows its Vibe and
 * Generic under its take, saved on the premise itself.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Lightbulb, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useSavePremise, type Premise } from '../../api/premises'
import type { Beat, Joke, SetEntry } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import type { MenuRow } from '../../components/ui/Menu'
import { MaterialTags, type Tags } from '../jokes/MaterialTags'
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
  moveItems: (pieceId: string) => MenuRow[]
}

const icon = 'inline-flex size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'
const foot = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-dim hover:bg-ink-3 hover:text-paper pointer-coarse:h-10'
const eyebrow = 'text-[11.5px] font-semibold tracking-[0.13em] uppercase'

function heading(entry: SetEntry, premise?: Premise) {
  if (entry.kind === 'crowd') return <span className={`${eyebrow} text-orchid`}>Crowd work</span>
  if (entry.kind === 'jokes') return <span className={`${eyebrow} text-faint`}>Standalone jokes</span>
  return <span className={`${eyebrow} text-leaf`}>Premise{premise ? '' : ' (deleted)'}</span>
}

/** The block's outline, thicker on the left like a joke card: a premise leaf green (sky blue
 *  when gated), crowd work orchid pink, standalone jokes white. */
function ring(entry: SetEntry, gated: boolean) {
  if (entry.kind === 'crowd') return 'ring-orchid border-orchid'
  if (entry.kind === 'premise') return gated ? 'bg-sky/5 ring-sky border-sky' : 'ring-leaf border-leaf'
  return 'ring-paper/80 border-paper'
}

function summary(entry: SetEntry, premise?: Premise) {
  if (entry.kind === 'crowd') return `${entry.questions.length} ${entry.questions.length === 1 ? 'question' : 'questions'}`
  const jokes = `${entry.pieces.length} ${entry.pieces.length === 1 ? 'joke' : 'jokes'}`
  if (entry.kind === 'jokes') return entry.title?.trim() ? `${entry.title.trim()} · ${jokes}` : jokes
  return `${premise?.take ?? 'Deleted premise'} · ${jokes}`
}

export function EntryBlock({ entry, index, beat, onChange, premises, canGatePremise, folded, onStep, onRemove, selecting, onSelect, onPick, onGroup, onAddJokes, ...list }: Props) {
  const data: DragData = { kind: 'entry', entryId: entry.id }
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entryKey(entry.id), data })
  const style = { transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }
  const premise = entry.kind === 'premise' && entry.premise_id ? premises.get(entry.premise_id) : undefined
  const gated = entry.kind === 'premise' && entry.gate
  const savePremise = useSavePremise()
  // Only what a save needs: fields left out (strength, status, Notes) stay as stored.
  const tag = (patch: Tags) => { if (premise) savePremise.mutate({ id: premise.id, input: { topic_id: premise.topic_id, take: premise.take, notes: premise.notes, version: premise.version, ...patch } }) }
  const name = entry.kind === 'premise' ? (premise?.take ?? 'the premise') : entry.kind === 'crowd' ? 'the crowd work' : entry.title?.trim() || 'the standalone jokes'
  return (
    <li ref={setNodeRef} style={style} data-entry={entry.id} className={`rounded-xl border-l-[5px] p-2.5 ring-[1.5px] sm:p-3 ${ring(entry, gated)} ${isDragging ? 'opacity-40' : ''}`}>
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
            <p className="leading-snug font-medium text-leaf">{premise?.take ?? 'This premise was deleted. Its jokes stay.'}</p>
            {premise?.notes && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{premise.notes}</p>}
            {premise && <div className="mt-2 flex flex-wrap gap-1"><MaterialTags value={premise} onChange={tag} what="this premise" /></div>}
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
            {entry.kind === 'jokes' && <Input aria-label="Name these jokes" maxLength={200} placeholder="Name these jokes (Gym reels?)" value={entry.title ?? ''} className="mb-2 font-medium"
              onChange={(e) => onChange(mapEntry(beat, entry.id, (x) => ({ ...x, title: e.target.value })))} />}
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
