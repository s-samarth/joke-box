/**
 * What follows your finger while you drag: a small card for the joke (with how many jokes its
 * gate brings along) or for the block. The row itself stays dimmed where it will land.
 */
import { GripVertical } from 'lucide-react'
import type { Premise } from '../../api/premises'
import type { Joke, SetEntry, SetPiece } from '../../api/types'
import { tone } from './tone'

type Props =
  | { piece: SetPiece; pieces: SetPiece[]; jokes: Map<string, Joke>; entry?: never; premises?: never }
  | { entry: SetEntry; premises: Map<string, Premise>; piece?: never; pieces?: never; jokes?: never }

const card = 'flex items-center gap-2 rounded-lg bg-ink-3 py-2 pr-3 pl-1 shadow-lift ring-1'

export function DragPreview(props: Props) {
  if (props.piece) {
    const p = props.piece
    const t = tone(p, p.gate > 0)
    const joke = props.jokes.get(p.joke_id)
    return (
      <div className={`${card} ring-rule-strong border-l-[3px] ${t.border}`}>
        <GripVertical size={17} className="shrink-0 text-faint" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{joke?.setup ?? 'Deleted joke'}</span>
        {p.gate > 0 && <span className="shrink-0 rounded-full bg-sky/15 px-2 py-0.5 text-[12px] font-semibold text-sky">Gate · {p.gate} inside</span>}
      </div>
    )
  }
  const e = props.entry
  const title = e.kind === 'crowd' ? 'Crowd work' : e.kind === 'jokes' ? 'Standalone jokes' : (e.premise_id && props.premises.get(e.premise_id)?.take) || 'Premise'
  return (
    <div className={`${card} ${e.kind === 'premise' ? 'text-leaf ring-leaf/60' : e.kind === 'crowd' ? 'text-orchid ring-orchid/60' : 'ring-rule-strong'}`}>
      <GripVertical size={17} className="shrink-0 text-faint" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
    </div>
  )
}
