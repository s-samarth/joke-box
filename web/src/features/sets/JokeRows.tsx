/**
 * A beat's jokes as rows you drag: a joke on its own, or a gate as a sky-blue box with its joke
 * on top and the jokes it unlocks inside (which can hold one gate of their own). Dragging a gate's
 * joke moves the whole box; jokes drag into and out of a box. The drag itself is in useBeatDrag.
 * A joke's bridges sit right under it, and move with it.
 */
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { skipTarget } from './beats'
import { BridgeEditor } from './BridgeBoxes'
import { bridgesOf, dropBridge, writeBridge } from './bridges'
import { height, type Row } from './gateRows'
import { JokeCard, type ListProps } from './JokeCard'
import { gateKey, jokeKey, type DragData } from './useBeatDrag'

interface Place extends ListProps {
  /** The gate these rows are inside, or null at the top of the list. */
  gateId: string | null
  depth: number
  /** The gates around these rows, outermost first. */
  inside: string[]
}

export function JokeRows({ rows, ...place }: Place & { rows: Row[] }) {
  return (
    <SortableContext items={rows.map((r) => jokeKey(r.piece.id))} strategy={verticalListSortingStrategy}>
      <ol className="space-y-2">{rows.map((r) => <RowItem key={r.piece.id} row={r} {...place} />)}</ol>
    </SortableContext>
  )
}

function RowItem({ row, ...place }: Place & { row: Row }) {
  const { entryId, gateId, depth, inside } = place
  const data: DragData = { kind: 'joke', entryId, pieceId: row.piece.id, gateId, depth, height: height(row), inside }
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: jokeKey(row.piece.id), data })
  const style = { transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }
  const grip = { listeners, attributes, setRef: setActivatorNodeRef }
  const gate = row.guarded.length > 0
  const { pieces, onChange, jokes } = place
  const edit = (change: (p: typeof row.piece) => typeof row.piece) => onChange(pieces.map((x) => (x.id === row.piece.id ? change(x) : x)))
  const after = `after ${jokes.get(row.piece.joke_id)?.setup ?? 'a deleted joke'}`
  return (
    <li ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-40' : ''} ${gate ? 'rounded-xl bg-sky/5 p-1 ring-1 ring-sky/40 sm:p-1.5' : ''}`}>
      <JokeCard {...place} piece={row.piece} isGate={gate} grip={grip} />
      <BridgeEditor bridges={bridgesOf(row.piece)} after={after} onWrite={(id, text) => edit((x) => writeBridge(x, id, text))} onDrop={(id) => edit((x) => dropBridge(x, id))} />
      {gate && <GateInside row={row} {...place} />}
    </li>
  )
}

/** Inside a gate's box: its jokes, + Joke, and where a miss skips to. All of it is the gate's drop
 * area; only the gate's own joke on top places a joke before or after the box. */
function GateInside({ row, ...place }: Place & { row: Row }) {
  const { entryId, depth, inside, pieces, onAddToGate } = place
  const id = row.piece.id
  const data: DragData = { kind: 'gate', entryId, gateId: id, depth: depth + 1, inside }
  const { setNodeRef, isOver } = useDroppable({ id: gateKey(id), data })
  const count = pieces.find((p) => p.id === id)?.gate ?? 0
  const at = pieces.findIndex((p) => p.id === id)
  const skip = skipTarget(pieces, at)
  return (
    <div ref={setNodeRef} className="mt-1.5 pl-1.5 sm:pl-3">
      <p className="mb-1.5 text-[12.5px] font-semibold tracking-wide text-sky">If it lands</p>
      <div className={`rounded-lg border-l-2 border-dashed pl-1.5 transition-colors sm:pl-2 ${isOver ? 'border-sky bg-sky/10' : 'border-sky/50'}`}>
        <JokeRows {...place} rows={row.guarded} gateId={id} depth={depth + 1} inside={[...inside, id]} />
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-dim">
        <button type="button" onClick={() => onAddToGate(id)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-sky hover:bg-sky/10 pointer-coarse:h-10">
          <Plus size={14} /> Joke in this gate
        </button>
        <span>{count === 1 ? 'Guards 1 joke' : `Guards ${count} jokes`}. If not, skip to {skip < pieces.length ? `#${skip + 1}` : 'the end of this list'}.</span>
      </p>
    </div>
  )
}
