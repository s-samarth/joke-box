/**
 * A joke in the Bird's eye view's board, and the gates around jokes. Everything a joke carries is
 * shown, small: its number in the set, setup, punchline (yellow locked, teal loose), Vibe, Generic,
 * status, runtime and tag lines. A gate is a sky box: its joke on top, then what rides on it.
 */
import type { Premise } from '../../api/premises'
import type { Joke, SetPiece } from '../../api/types'
import { clock } from '../../lib/duration'
import { statusOf } from '../../lib/jokeMeta'
import { genericTone, type Tone } from '../jokes/vibeTone'
import type { Row } from './gateRows'

export interface BoardData {
  jokes: Map<string, Joke>
  premises: Map<string, Premise>
  number: Map<string, number>
  vibe: (id: string | null | undefined) => Tone
  vibeName: (id: string | null | undefined) => string
  /** The joke picked on the strip, outlined for a moment. */
  flash: string | null
}

const chip = 'inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] leading-[1.45] whitespace-nowrap'

export function VibeChip({ id, data }: { id: string | null | undefined; data: BoardData }) {
  const t = data.vibe(id)
  return <span className={chip} style={t.chip}><span className="size-1.5 rounded-full" style={t.dot} />{data.vibeName(id)}</span>
}

export function GenericChip({ generic }: { generic: boolean | null | undefined }) {
  if (generic === true || generic === false) return <span className={`${chip} ${genericTone(generic).chip}`}>{generic ? 'Generic' : 'Non-generic'}</span>
  return <span className={`${chip} bg-amber/15 text-amber ring-1 ring-amber/40`}>Generic?</span>
}

export function StatusTag({ status }: { status: string }) {
  return <span className="rounded border border-rule-strong px-1 text-[10.5px] whitespace-nowrap text-faint">{status}</span>
}

function JokeCard({ piece, data }: { piece: SetPiece; data: BoardData }) {
  const joke = data.jokes.get(piece.joke_id)
  const n = data.number.get(piece.id)
  const tone = piece.loose ? 'text-teal' : 'text-tape'
  return (
    <div id={`be-${piece.id}`} className={`grid grid-cols-[18px_1fr] gap-1 rounded-lg border-l-[3px] bg-ink-3 px-1.5 py-1.5 transition-shadow ${piece.loose ? 'border-dashed border-teal' : 'border-tape'} ${data.flash === piece.id ? 'ring-2 ring-paper' : ''}`}>
      <span className={`text-[12.5px] font-bold tabular ${tone}`}>{n}</span>
      <div className="min-w-0">
        {!joke ? <p className="text-[12px] text-faint">This joke is gone.</p> : <>
          <p className="text-[11px] leading-snug whitespace-pre-line text-dim">{joke.setup}</p>
          <p className={`mt-0.5 text-[12.5px] leading-snug font-medium whitespace-pre-line ${tone}`}>{joke.punchline || joke.setup}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px] text-faint">
            <VibeChip id={joke.persona} data={data} />
            <GenericChip generic={joke.generic} />
            <StatusTag status={statusOf(joke.status)} />
            <span className="tabular">{clock(joke.duration_seconds)}</span>
            <span className={piece.loose ? 'text-teal' : ''}>{piece.loose ? 'Loose' : 'Locked'}</span>
            {joke.tag_lines.length > 0 && <span>+{joke.tag_lines.length} {joke.tag_lines.length === 1 ? 'tag' : 'tags'}</span>}
            {piece.pinned && <span>pinned version</span>}
          </div>
        </>}
      </div>
    </div>
  )
}

/** A list read as gate boxes (gateRows.ts): a joke alone, or a gate with what rides on it. */
export function JokeRows({ rows, data }: { rows: Row[]; data: BoardData }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => r.guarded.length === 0 ? <JokeCard key={r.piece.id} piece={r.piece} data={data} /> : (
        <div key={r.piece.id} className="rounded-lg bg-sky/5 p-1 ring-[1.5px] ring-sky">
          <JokeCard piece={r.piece} data={data} />
          <div className="mt-1 ml-2 border-l-2 border-dotted border-sky pl-1.5">
            <p className="mb-1 text-[10.5px] font-semibold text-sky">If {data.number.get(r.piece.id)} lands</p>
            <JokeRows rows={r.guarded} data={data} />
          </div>
        </div>
      ))}
    </div>
  )
}
