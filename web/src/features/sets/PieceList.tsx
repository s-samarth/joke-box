/**
 * The jokes of a premise (or of a list with no premise), in order. Each keeps its number. Locked
 * is tape-yellow, loose is teal (still in order, just flexible), and a gate is sky blue: the
 * jokes it guards sit indented under it. Tap a joke to read it whole.
 */
import { ArrowDown, ArrowUp, Minus, Plus, X } from 'lucide-react'
import type { Joke, SetPiece } from '../../api/types'
import { guardMap, skipTarget } from './beats'
import { stepGate, swap, toggleGate, toggleLoose, togglePin } from './beatEdit'

interface Props {
  pieces: SetPiece[]
  onChange: (pieces: SetPiece[]) => void
  jokes: Map<string, Joke>
  leadOf: (clusterId: string) => string | null | undefined
  onOpen: (joke: Joke) => void
}

const tool = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-semibold transition-colors'
const icon = 'inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'

function tone(p: SetPiece) {
  if (p.gate) return { text: 'text-sky', border: 'border-sky', label: 'Gate' }
  return p.loose ? { text: 'text-teal', border: 'border-teal', label: 'Loose' } : { text: 'text-tape', border: 'border-tape', label: 'Locked' }
}

export function PieceList({ pieces, onChange, jokes, leadOf, onOpen }: Props) {
  const guards = guardMap(pieces)
  if (!pieces.length) return <p className="py-2 text-sm text-faint">No jokes here yet.</p>
  return (
    <ol className="space-y-2">
      {pieces.map((p, i) => {
        const joke = jokes.get(p.joke_id)
        const t = tone(p)
        const after = i + p.gate + 1
        const skip = p.gate ? skipTarget(pieces, i) : after
        return (
          <li key={p.id} className={guards[i] !== null ? 'ml-5 border-l-2 border-dashed border-sky/50 pl-3' : ''}>
            <div className={`rounded-lg border-l-[3px] bg-ink-2 py-2 pr-1 pl-3 ${t.border}`}>
              <div className="flex gap-3">
                <span className={`w-5 shrink-0 pt-0.5 text-right font-semibold tabular ${t.text}`}>{i + 1}</span>
                <button type="button" onClick={() => joke && onOpen(joke)} className="min-w-0 flex-1 text-left" aria-label={`Read the whole joke: ${joke?.setup ?? 'deleted joke'}`}>
                  <p className="line-clamp-2 leading-snug">{joke?.setup ?? 'Deleted joke'}</p>
                  {joke?.punchline && <p className={`mt-0.5 line-clamp-2 leading-snug ${t.text}`}>{joke.punchline}</p>}
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-8">
                <button type="button" onClick={() => onChange(toggleLoose(pieces, i))} aria-pressed={!p.loose} title="Locked: in this place. Loose: keeps its number, but you can move or drop it on the night."
                  className={`${tool} ${p.loose ? 'bg-teal/15 text-teal' : 'bg-tape/15 text-tape'}`}>{p.loose ? 'Loose' : 'Locked'}</button>
                <button type="button" onClick={() => onChange(toggleGate(pieces, i))} aria-pressed={p.gate > 0} disabled={!p.gate && i === pieces.length - 1}
                  title={p.gate ? 'Remove the gate' : 'Make this a gate: the jokes after it only if it lands'}
                  className={`${tool} disabled:opacity-30 ${p.gate ? 'bg-sky/15 text-sky' : 'text-dim hover:bg-ink-3'}`}>Gate</button>
                {p.cluster_id && (
                  <button type="button" onClick={() => onChange(pieces.map((x, n) => (n === i ? togglePin(x, leadOf(p.cluster_id!)) : x)))}
                    title={p.pinned ? 'This version, even if the lead changes. Tap to follow the lead.' : 'Plays the cluster lead. Tap to pin this version.'}
                    className={`${tool} text-dim hover:bg-ink-3`}>{p.pinned ? 'Pinned version' : 'Follows the lead'}</button>
                )}
                <span className="ml-auto flex [&>button]:size-11">
                  <button type="button" className={icon} disabled={i === 0} onClick={() => onChange(swap(pieces, i, -1))} aria-label="Move up"><ArrowUp size={15} /></button>
                  <button type="button" className={icon} disabled={i === pieces.length - 1} onClick={() => onChange(swap(pieces, i, 1))} aria-label="Move down"><ArrowDown size={15} /></button>
                  <button type="button" className={`${icon} ml-3`} onClick={() => onChange(pieces.filter((_, n) => n !== i))} aria-label="Take out of the beat"><X size={15} /></button>
                </span>
              </div>
            </div>
            {p.gate > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-3 text-sm text-dim">
                If it lands, do the next
                <button type="button" className={icon} onClick={() => onChange(stepGate(pieces, i, -1))} disabled={p.gate <= 1} aria-label="Guard fewer"><Minus size={14} /></button>
                <b className="text-sky tabular">{p.gate}</b>
                <button type="button" className={icon} onClick={() => onChange(stepGate(pieces, i, 1))} disabled={after >= pieces.length} aria-label="Guard more"><Plus size={14} /></button>
                {p.gate === 1 ? 'joke' : 'jokes'}. If not, skip to {skip < pieces.length ? `#${skip + 1}` : 'the end of this list'}.
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
