/**
 * One joke in a beat's list: its grip, its number, the joke (tap to read it whole) and its tools.
 * Locked is tape-yellow, loose is teal (still in order, just flexible), a gate is sky blue. The
 * arrows walk it one place at a time, into and out of gates on the way (gateEdit.ts). A joke with
 * a persona says which side it shows, beside its tools.
 */
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import type { Joke, SetPiece } from '../../api/types'
import { personaLabel, usePersonaField } from '../jokes/persona'
import { togglePin, toggleLoose } from './beatEdit'
import { DragGrip } from './DragGrip'
import { canGate, canStep, stepJoke, toggleGate } from './gateEdit'
import { GATE_DEPTH } from './gateRows'
import { tone } from './tone'

export interface ListProps {
  entryId: string
  /** The whole list, flat, as stored. */
  pieces: SetPiece[]
  onChange: (pieces: SetPiece[]) => void
  jokes: Map<string, Joke>
  leadOf: (clusterId: string) => string | null | undefined
  onOpen: (joke: Joke) => void
  /** + Joke inside a gate's box. */
  onAddToGate: (gateId: string) => void
}

interface Props extends ListProps {
  piece: SetPiece
  isGate: boolean
  /** How many gates it's inside. */
  depth: number
  grip: { listeners: DraggableSyntheticListeners; attributes: DraggableAttributes; setRef: (el: HTMLElement | null) => void }
}

const tool = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-semibold transition-colors pointer-coarse:h-10'
const icon = 'inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'

export function JokeCard({ piece: p, isGate, depth, grip, pieces, onChange, jokes, leadOf, onOpen }: Props) {
  const joke = jokes.get(p.joke_id)
  const persona = usePersonaField()
  const side = personaLabel(joke?.persona, persona)
  const t = tone(p, isGate)
  const n = pieces.findIndex((x) => x.id === p.id) + 1
  const gateable = isGate || canGate(pieces, p.id)
  const name = joke?.setup ?? 'deleted joke'
  return (
    <div className={`rounded-lg border-l-[3px] bg-ink-2 py-1.5 pr-1 pl-1 ${t.border}`}>
      <div className="flex gap-1">
        <DragGrip label={name} {...grip} />
        <span className={`w-6 shrink-0 pt-2 text-right font-semibold tabular ${t.text}`}>{n}</span>
        <button type="button" onClick={() => joke && onOpen(joke)} className="min-w-0 flex-1 py-1.5 pl-2 text-left" aria-label={`Read the whole joke: ${name}`}>
          <p className="line-clamp-2 leading-snug">{joke?.setup ?? 'Deleted joke'}</p>
          {joke?.punchline && <p className={`mt-0.5 line-clamp-2 leading-snug ${t.text}`}>{joke.punchline}</p>}
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 pl-1 sm:pl-9">
        <button type="button" onClick={() => onChange(toggleLoose(pieces, p.id))} aria-pressed={!p.loose} title="Locked: in this place. Loose: keeps its number, but you can move or drop it on the night."
          className={`${tool} ${p.loose ? 'bg-teal/15 text-teal' : 'bg-tape/15 text-tape'}`}>{p.loose ? 'Loose' : 'Locked'}</button>
        {depth < GATE_DEPTH && (
          <button type="button" onClick={() => onChange(toggleGate(pieces, p.id))} aria-pressed={isGate} disabled={!gateable}
            title={isGate ? 'Remove the gate: its jokes stay where they are' : gateable ? 'Make this a gate: the joke under it goes inside, and is done only if this lands' : 'No joke under it to gate, or gates would go more than two deep'}
            className={`${tool} disabled:opacity-30 ${isGate ? 'bg-sky/15 text-sky' : 'text-dim hover:bg-ink-3'}`}>Gate</button>
        )}
        {p.cluster_id && (
          <button type="button" onClick={() => onChange(pieces.map((x) => (x.id === p.id ? togglePin(x, leadOf(p.cluster_id!)) : x)))}
            title={p.pinned ? 'This version, even if the lead changes. Tap to follow the lead.' : 'Plays the cluster lead. Tap to pin this version.'}
            className={`${tool} text-dim hover:bg-ink-3`}>{p.pinned ? 'Pinned version' : 'Follows the lead'}</button>
        )}
        {side && <span className="ml-1 rounded-md px-2 py-0.5 text-xs text-dim ring-1 ring-rule" title="The persona side this joke shows">{side}</span>}
        <span className="ml-auto flex">
          <button type="button" className={icon} disabled={!canStep(pieces, p.id, -1)} onClick={() => onChange(stepJoke(pieces, p.id, -1))} aria-label={`Move up: ${name}`}><ArrowUp size={15} /></button>
          <button type="button" className={icon} disabled={!canStep(pieces, p.id, 1)} onClick={() => onChange(stepJoke(pieces, p.id, 1))} aria-label={`Move down: ${name}`}><ArrowDown size={15} /></button>
          <button type="button" className={`${icon} ml-2`} onClick={() => onChange(pieces.filter((x) => x.id !== p.id))} aria-label={`Take out of the beat: ${name}`}><X size={15} /></button>
        </span>
      </div>
    </div>
  )
}
