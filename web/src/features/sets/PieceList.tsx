/**
 * The jokes of a premise (or of a list with no premise), in order. Each keeps its number. Gates
 * are boxes (JokeRows). The whole list is a drop area too, so a joke can land in an empty list or
 * at its end. While you're picking jokes to put under a premise (`picked`), each row is a tick
 * and the tools, grips and arrows step aside.
 */
import { useDroppable } from '@dnd-kit/core'
import { Check } from 'lucide-react'
import type { SetPiece } from '../../api/types'
import { rowsOf } from './gateRows'
import type { ListProps } from './JokeCard'
import { tone } from './tone'
import { JokeRows } from './JokeRows'
import { listKey, type DragData } from './useBeatDrag'

interface Props extends ListProps {
  /** Picking: the pieces ticked so far. */
  picked?: string[]
  onPick?: (pieceId: string) => void
}

export function PieceList({ picked, onPick, ...list }: Props) {
  const data: DragData = { kind: 'list', entryId: list.entryId }
  const { setNodeRef, isOver } = useDroppable({ id: listKey(list.entryId), data, disabled: !!picked })
  if (picked) return <PickList pieces={list.pieces} jokes={list.jokes} picked={picked} onPick={onPick} />
  return (
    <div ref={setNodeRef} className={`rounded-lg transition-colors ${isOver && !list.pieces.length ? 'bg-ink-3/60' : ''}`}>
      {list.pieces.length
        ? <JokeRows {...list} rows={rowsOf(list.pieces)} gateId={null} depth={0} inside={[]} />
        : <p className="py-3 text-sm text-faint">No jokes here yet. Add one, or drag one in.</p>}
    </div>
  )
}

function PickList({ pieces, jokes, picked, onPick }: Pick<Props, 'pieces' | 'jokes' | 'onPick'> & { picked: string[] }) {
  if (!pieces.length) return <p className="py-2 text-sm text-faint">No jokes here yet.</p>
  return (
    <ol className="space-y-2">
      {pieces.map((p: SetPiece) => {
        const joke = jokes.get(p.joke_id)
        const t = tone(p, p.gate > 0)
        const on = picked.includes(p.id)
        return (
          <li key={p.id}>
            <button type="button" role="checkbox" aria-checked={on} onClick={() => onPick?.(p.id)}
              className={`flex w-full gap-3 rounded-lg border-l-[3px] py-2 pr-2 pl-3 text-left ${on ? 'border-tape bg-tape/10' : `bg-ink-2 hover:bg-ink-3/60 ${t.border}`}`}>
              <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-tape bg-tape text-tape-ink' : 'border-faint'}`}>{on && <Check size={13} strokeWidth={3} aria-hidden />}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 leading-snug">{joke?.setup ?? 'Deleted joke'}</span>
                {joke?.punchline && <span className={`mt-0.5 line-clamp-1 leading-snug ${t.text}`}>{joke.punchline}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
